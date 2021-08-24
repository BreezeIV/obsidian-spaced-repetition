import { Notice, Plugin, addIcon, TAbstractFile, TFile, HeadingCache, getAllTags } from "obsidian";
import * as graph from "pagerank.js";

import { SRSettingTab, SRSettings, DEFAULT_SETTINGS } from "src/settings";
import { FlashcardModal, Deck } from "src/flashcard-modal";
import { StatsModal, Stats } from "src/stats-modal";
import { ReviewQueueListView, REVIEW_QUEUE_VIEW_TYPE } from "src/sidebar";
import { Card, ReviewResponse, schedule } from "src/scheduling";
import { CardType } from "src/types";
import {
    CROSS_HAIRS_ICON,
    YAML_FRONT_MATTER_REGEX,
    SCHEDULING_INFO_REGEX,
    LEGACY_SCHEDULING_EXTRACTOR,
    MULTI_SCHEDULING_EXTRACTOR,
} from "src/constants";
import { escapeRegexString, cyrb53, removeLegacyKeys } from "src/utils";
import { ReviewDeck, ReviewDeckSelectionModal } from "src/review-deck";
import { t } from "src/lang/helpers";
import { parse } from "src/parser";
import { Logger, createLogger } from "src/logger";

interface PluginData {
    settings: SRSettings;
    buryDate: string;
    // hashes of card texts
    // should work as long as user doesn't modify card's text
    // which covers most of the cases
    buryList: string[];
}

const DEFAULT_DATA: PluginData = {
    settings: DEFAULT_SETTINGS,
    buryDate: "",
    buryList: [],
};

export interface SchedNote {
    note: TFile;
    dueUnix: number;
}

export interface LinkStat {
    sourcePath: string;
    linkCount: number;
}

export default class SRPlugin extends Plugin {
    private statusBar: HTMLElement;
    private reviewQueueView: ReviewQueueListView;
    public data: PluginData;
    public logger: Logger;

    public reviewDecks: { [deckKey: string]: ReviewDeck } = {};
    public lastSelectedReviewDeck: string;

    public newNotes: TFile[] = [];
    public scheduledNotes: SchedNote[] = [];
    private easeByPath: Record<string, number> = {};
    private incomingLinks: Record<string, LinkStat[]> = {};
    private pageranks: Record<string, number> = {};
    private dueNotesCount: number = 0;
    public dueDatesNotes: Record<number, number> = {}; // Record<# of days in future, due count>

    public deckTree: Deck = new Deck("root", null);
    public dueDatesFlashcards: Record<number, number> = {}; // Record<# of days in future, due count>
    public cardStats: Stats;

    // prevent calling these functions if another instance is already running
    private syncLock: boolean = false;

    async onload(): Promise<void> {
        await this.loadPluginData();
        this.logger = createLogger(console, this.data.settings.logLevel);

        addIcon("crosshairs", CROSS_HAIRS_ICON);

        this.statusBar = this.addStatusBarItem();
        this.statusBar.classList.add("mod-clickable");
        this.statusBar.setAttribute("aria-label", t("Open a note for review"));
        this.statusBar.setAttribute("aria-label-position", "top");
        this.statusBar.addEventListener("click", (_: any) => {
            if (!this.syncLock) {
                this.sync();
                this.reviewNextNoteModal();
            }
        });

        this.addRibbonIcon("crosshairs", t("Review flashcards"), async () => {
            if (!this.syncLock) {
                await this.sync();
                new FlashcardModal(this.app, this).open();
            }
        });

        this.registerView(
            REVIEW_QUEUE_VIEW_TYPE,
            (leaf) => (this.reviewQueueView = new ReviewQueueListView(leaf, this))
        );

        if (!this.data.settings.disableFileMenuReviewOptions) {
            this.registerEvent(
                this.app.workspace.on("file-menu", (menu, fileish: TAbstractFile) => {
                    if (fileish instanceof TFile && fileish.extension === "md") {
                        menu.addItem((item) => {
                            item.setTitle(t("Review: Easy"))
                                .setIcon("crosshairs")
                                .onClick((_) => {
                                    this.saveReviewResponse(fileish, ReviewResponse.Easy);
                                });
                        });

                        menu.addItem((item) => {
                            item.setTitle(t("Review: Good"))
                                .setIcon("crosshairs")
                                .onClick((_) => {
                                    this.saveReviewResponse(fileish, ReviewResponse.Good);
                                });
                        });

                        menu.addItem((item) => {
                            item.setTitle(t("Review: Hard"))
                                .setIcon("crosshairs")
                                .onClick((_) => {
                                    this.saveReviewResponse(fileish, ReviewResponse.Hard);
                                });
                        });
                    }
                })
            );
        }

        this.addCommand({
            id: "srs-note-review-open-note",
            name: t("Open a note for review"),
            callback: () => {
                if (!this.syncLock) {
                    this.sync();
                    this.reviewNextNoteModal();
                }
            },
        });

        this.addCommand({
            id: "srs-note-review-easy",
            name: t("Review note as easy"),
            callback: () => {
                const openFile: TFile | null = this.app.workspace.getActiveFile();
                if (openFile && openFile.extension === "md")
                    this.saveReviewResponse(openFile, ReviewResponse.Easy);
            },
        });

        this.addCommand({
            id: "srs-note-review-good",
            name: t("Review note as good"),
            callback: () => {
                const openFile: TFile | null = this.app.workspace.getActiveFile();
                if (openFile && openFile.extension === "md")
                    this.saveReviewResponse(openFile, ReviewResponse.Good);
            },
        });

        this.addCommand({
            id: "srs-note-review-hard",
            name: t("Review note as hard"),
            callback: () => {
                const openFile: TFile | null = this.app.workspace.getActiveFile();
                if (openFile && openFile.extension === "md")
                    this.saveReviewResponse(openFile, ReviewResponse.Hard);
            },
        });

        this.addCommand({
            id: "srs-review-flashcards",
            name: t("Review flashcards"),
            callback: async () => {
                if (!this.syncLock) {
                    await this.sync();
                    new FlashcardModal(this.app, this).open();
                }
            },
        });

        this.addCommand({
            id: "srs-view-stats",
            name: t("View statistics"),
            callback: async () => {
                if (!this.syncLock) {
                    await this.sync();
                    new StatsModal(this.app, this).open();
                }
            },
        });

        this.addSettingTab(new SRSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            this.initView();
            setTimeout(() => this.sync(), 2000);
        });
    }

    onunload(): void {
        this.app.workspace.getLeavesOfType(REVIEW_QUEUE_VIEW_TYPE).forEach((leaf) => leaf.detach());
    }

    async sync(): Promise<void> {
        if (this.syncLock) {
            return;
        }
        this.syncLock = true;

        let notes: TFile[] = this.app.vault.getMarkdownFiles();

        // reset notes stuff
        graph.reset();
        this.easeByPath = {};
        this.incomingLinks = {};
        this.pageranks = {};
        this.dueNotesCount = 0;
        this.dueDatesNotes = {};
        this.reviewDecks = {};

        // reset flashcards stuff
        this.deckTree = new Deck("root", null);
        this.dueDatesFlashcards = {};
        this.cardStats = {
            eases: {},
            intervals: {},
            newCount: 0,
            youngCount: 0,
            matureCount: 0,
        };

        let now = window.moment(Date.now());
        let todayDate: string = now.format("YYYY-MM-DD");
        // clear bury list if we've changed dates
        if (todayDate !== this.data.buryDate) {
            this.data.buryDate = todayDate;
            this.data.buryList = [];
        }

        for (let note of notes) {
            if (
                this.data.settings.noteFoldersToIgnore.some((folder) =>
                    note.path.startsWith(folder)
                )
            ) {
                continue;
            }

            if (this.incomingLinks[note.path] === undefined) {
                this.incomingLinks[note.path] = [];
            }

            let links = this.app.metadataCache.resolvedLinks[note.path] || {};
            for (let targetPath in links) {
                if (this.incomingLinks[targetPath] === undefined)
                    this.incomingLinks[targetPath] = [];

                // markdown files only
                if (targetPath.split(".").pop()!.toLowerCase() === "md") {
                    this.incomingLinks[targetPath].push({
                        sourcePath: note.path,
                        linkCount: links[targetPath],
                    });

                    graph.link(note.path, targetPath, links[targetPath]);
                }
            }

            // find deck path
            let deckPath: string[] = [];
            if (this.data.settings.convertFoldersToDecks) {
                deckPath = note.path.split("/");
                deckPath.pop(); // remove filename
                if (deckPath.length === 0) {
                    deckPath = ["/"];
                }
            } else {
                let fileCachedData = this.app.metadataCache.getFileCache(note) || {};
                let tags = getAllTags(fileCachedData) || [];

                outer: for (let tagToReview of this.data.settings.flashcardTags) {
                    for (let tag of tags) {
                        if (tag === tagToReview || tag.startsWith(tagToReview + "/")) {
                            deckPath = tag.substring(1).split("/");
                            break outer;
                        }
                    }
                }
            }

            if (deckPath.length !== 0) {
                let flashcardsInNoteAvgEase = await this.findFlashcardsInNote(note, deckPath);

                if (flashcardsInNoteAvgEase > 0) {
                    this.easeByPath[note.path] = flashcardsInNoteAvgEase;
                }
            }

            let fileCachedData = this.app.metadataCache.getFileCache(note) || {};

            let frontmatter = fileCachedData.frontmatter || <Record<string, any>>{};
            let tags = getAllTags(fileCachedData) || [];

            let shouldIgnore: boolean = true;
            for (let tag of tags) {
                if (
                    this.data.settings.tagsToReview.some(
                        (tagToReview) => tag === tagToReview || tag.startsWith(tagToReview + "/")
                    )
                ) {
                    if (!this.reviewDecks.hasOwnProperty(tag)) {
                        this.reviewDecks[tag] = new ReviewDeck(tag);
                    }
                    shouldIgnore = false;
                    break;
                }
            }
            if (shouldIgnore) {
                continue;
            }

            // file has no scheduling information
            if (
                !(
                    frontmatter.hasOwnProperty("sr-due") &&
                    frontmatter.hasOwnProperty("sr-interval") &&
                    frontmatter.hasOwnProperty("sr-ease")
                )
            ) {
                for (let tag of tags) {
                    if (this.reviewDecks.hasOwnProperty(tag)) {
                        this.reviewDecks[tag].newNotes.push(note);
                    }
                }
                continue;
            }

            let dueUnix: number = window
                .moment(frontmatter["sr-due"], ["YYYY-MM-DD", "DD-MM-YYYY", "ddd MMM DD YYYY"])
                .valueOf();
            for (let tag of tags) {
                if (this.reviewDecks.hasOwnProperty(tag)) {
                    this.reviewDecks[tag].scheduledNotes.push({ note, dueUnix });

                    if (dueUnix <= now.valueOf()) {
                        this.reviewDecks[tag].dueNotesCount++;
                    }
                }
            }

            if (this.easeByPath.hasOwnProperty(note.path)) {
                this.easeByPath[note.path] =
                    (this.easeByPath[note.path] + frontmatter["sr-ease"]) / 2;
            } else {
                this.easeByPath[note.path] = frontmatter["sr-ease"];
            }

            if (dueUnix <= now.valueOf()) {
                this.dueNotesCount++;
            }

            let nDays: number = Math.ceil((dueUnix - now.valueOf()) / (24 * 3600 * 1000));
            if (!this.dueDatesNotes.hasOwnProperty(nDays)) {
                this.dueDatesNotes[nDays] = 0;
            }
            this.dueDatesNotes[nDays]++;
        }

        graph.rank(0.85, 0.000001, (node: string, rank: number) => {
            this.pageranks[node] = rank * 10000;
        });

        // sort the deck names
        this.deckTree.sortSubdecksList();

        for (let deckKey in this.reviewDecks) {
            this.reviewDecks[deckKey].sortNotes(this.pageranks);
        }

        this.logger.info(`Sync took ${Date.now() - now.valueOf()}ms`);

        let noteCountText: string = this.dueNotesCount === 1 ? t("note") : t("notes");
        let cardCountText: string = this.deckTree.dueFlashcardsCount === 1 ? t("card") : t("cards");
        this.statusBar.setText(
            t("Review") +
                `: ${this.dueNotesCount} ${noteCountText}, ` +
                `${this.deckTree.dueFlashcardsCount} ${cardCountText} ` +
                t("due")
        );
        this.reviewQueueView.redraw();

        this.syncLock = false;
    }

    async saveReviewResponse(note: TFile, response: ReviewResponse): Promise<void> {
        let fileCachedData = this.app.metadataCache.getFileCache(note) || {};
        let frontmatter = fileCachedData.frontmatter || <Record<string, any>>{};

        let tags = getAllTags(fileCachedData) || [];
        if (this.data.settings.noteFoldersToIgnore.some((folder) => note.path.startsWith(folder))) {
            new Notice(t("Note is saved under ignored folder (check settings)."));
            return;
        }

        let shouldIgnore: boolean = true;
        for (let tag of tags) {
            if (
                this.data.settings.tagsToReview.some(
                    (tagToReview) => tag === tagToReview || tag.startsWith(tagToReview + "/")
                )
            ) {
                shouldIgnore = false;
                break;
            }
        }

        if (shouldIgnore) {
            new Notice(t("Please tag the note appropriately for reviewing (in settings)."));
            return;
        }

        let fileText: string = await this.app.vault.read(note);
        let ease: number,
            interval: number,
            delayBeforeReview: number,
            now: number = Date.now();
        // new note
        if (
            !(
                frontmatter.hasOwnProperty("sr-due") &&
                frontmatter.hasOwnProperty("sr-interval") &&
                frontmatter.hasOwnProperty("sr-ease")
            )
        ) {
            let linkTotal: number = 0,
                linkPGTotal: number = 0,
                totalLinkCount: number = 0;

            for (let statObj of this.incomingLinks[note.path] || []) {
                let ease: number = this.easeByPath[statObj.sourcePath];
                if (ease) {
                    linkTotal += statObj.linkCount * this.pageranks[statObj.sourcePath] * ease;
                    linkPGTotal += this.pageranks[statObj.sourcePath] * statObj.linkCount;
                    totalLinkCount += statObj.linkCount;
                }
            }

            let outgoingLinks = this.app.metadataCache.resolvedLinks[note.path] || {};
            for (let linkedFilePath in outgoingLinks) {
                let ease: number = this.easeByPath[linkedFilePath];
                if (ease) {
                    linkTotal +=
                        outgoingLinks[linkedFilePath] * this.pageranks[linkedFilePath] * ease;
                    linkPGTotal += this.pageranks[linkedFilePath] * outgoingLinks[linkedFilePath];
                    totalLinkCount += outgoingLinks[linkedFilePath];
                }
            }

            let linkContribution: number =
                this.data.settings.maxLinkFactor *
                Math.min(1.0, Math.log(totalLinkCount + 0.5) / Math.log(64));
            ease =
                (1.0 - linkContribution) * this.data.settings.baseEase +
                (totalLinkCount > 0
                    ? (linkContribution * linkTotal) / linkPGTotal
                    : linkContribution * this.data.settings.baseEase);
            // add note's average flashcard ease if available
            if (this.easeByPath.hasOwnProperty(note.path)) {
                ease = (ease + this.easeByPath[note.path]) / 2;
            }
            ease = Math.round(ease);
            interval = 1.0;
            delayBeforeReview = 0;
        } else {
            interval = frontmatter["sr-interval"];
            ease = frontmatter["sr-ease"];
            delayBeforeReview =
                now -
                window
                    .moment(frontmatter["sr-due"], ["YYYY-MM-DD", "DD-MM-YYYY", "ddd MMM DD YYYY"])
                    .valueOf();
        }

        let schedObj: Record<string, number> = schedule(
            response,
            interval,
            ease,
            delayBeforeReview,
            this.data.settings,
            this.dueDatesNotes
        );
        interval = schedObj.interval;
        ease = schedObj.ease;

        let due = window.moment(now + interval * 24 * 3600 * 1000);
        let dueString: string = due.format("YYYY-MM-DD");

        // check if scheduling info exists
        if (SCHEDULING_INFO_REGEX.test(fileText)) {
            let schedulingInfo = SCHEDULING_INFO_REGEX.exec(fileText)!;
            fileText = fileText.replace(
                SCHEDULING_INFO_REGEX,
                `---\n${schedulingInfo[1]}sr-due: ${dueString}\n` +
                    `sr-interval: ${interval}\nsr-ease: ${ease}\n` +
                    `${schedulingInfo[5]}---`
            );
        } else if (YAML_FRONT_MATTER_REGEX.test(fileText)) {
            // new note with existing YAML front matter
            let existingYaml = YAML_FRONT_MATTER_REGEX.exec(fileText)!;
            fileText = fileText.replace(
                YAML_FRONT_MATTER_REGEX,
                `---\n${existingYaml[1]}sr-due: ${dueString}\n` +
                    `sr-interval: ${interval}\nsr-ease: ${ease}\n---`
            );
        } else {
            fileText =
                `---\nsr-due: ${dueString}\nsr-interval: ${interval}\n` +
                `sr-ease: ${ease}\n---\n\n${fileText}`;
        }

        if (this.data.settings.burySiblingCards) {
            await this.findFlashcardsInNote(note, [], true); // bury all cards in current note
            await this.savePluginData();
        }
        await this.app.vault.modify(note, fileText);

        new Notice(t("Response received."));

        setTimeout(() => {
            if (!this.syncLock) {
                this.sync();
                if (this.data.settings.autoNextNote) {
                    this.reviewNextNote(this.lastSelectedReviewDeck);
                }
            }
        }, 500);
    }

    async reviewNextNoteModal(): Promise<void> {
        let reviewDeckNames: string[] = Object.keys(this.reviewDecks);
        if (reviewDeckNames.length === 1) {
            this.reviewNextNote(reviewDeckNames[0]);
        } else {
            let deckSelectionModal = new ReviewDeckSelectionModal(this.app, reviewDeckNames);
            deckSelectionModal.submitCallback = (deckKey: string) => this.reviewNextNote(deckKey);
            deckSelectionModal.open();
        }
    }

    async reviewNextNote(deckKey: string): Promise<void> {
        if (!this.reviewDecks.hasOwnProperty(deckKey)) {
            new Notice("No deck exists for " + deckKey);
            return;
        }

        this.lastSelectedReviewDeck = deckKey;
        let deck = this.reviewDecks[deckKey];

        if (deck.dueNotesCount > 0) {
            let index = this.data.settings.openRandomNote
                ? Math.floor(Math.random() * deck.dueNotesCount)
                : 0;
            this.app.workspace.activeLeaf!.openFile(deck.scheduledNotes[index].note);
            return;
        }

        if (deck.newNotes.length > 0) {
            let index = this.data.settings.openRandomNote
                ? Math.floor(Math.random() * deck.newNotes.length)
                : 0;
            this.app.workspace.activeLeaf!.openFile(deck.newNotes[index]);
            return;
        }

        new Notice(t("You're all caught up now :D."));
    }

    async findFlashcardsInNote(
        note: TFile,
        deckPath: string[],
        buryOnly: boolean = false
    ): Promise<number> {
        let fileText: string = await this.app.vault.read(note);
        let fileCachedData = this.app.metadataCache.getFileCache(note) || {};
        let headings: HeadingCache[] = fileCachedData.headings || [];
        let fileChanged: boolean = false,
            deckAdded: boolean = false,
            totalNoteEase: number = 0,
            scheduledCount: number = 0;

        let now: number = Date.now();
        let parsedCards: [CardType, string, number][] = parse(
            fileText,
            this.data.settings.singlelineCardSeparator,
            this.data.settings.singlelineReversedCardSeparator,
            this.data.settings.multilineCardSeparator,
            this.data.settings.multilineReversedCardSeparator
        );
        for (let parsedCard of parsedCards) {
            let cardType: CardType = parsedCard[0],
                cardText: string = parsedCard[1],
                lineNo: number = parsedCard[2];

            if (cardType === CardType.Cloze && this.data.settings.disableClozeCards) {
                continue;
            }

            let cardTextHash: string = cyrb53(cardText);

            if (buryOnly) {
                this.data.buryList.push(cardTextHash);
                continue;
            }

            if (!deckAdded) {
                this.deckTree.createDeck([...deckPath]);
                deckAdded = true;
            }

            let siblingMatches: [string, string][] = [];
            if (cardType === CardType.Cloze) {
                let front: string, back: string;
                for (let m of cardText.matchAll(/==(.*?)==/gm)) {
                    let deletionStart: number = m.index!,
                        deletionEnd: number = deletionStart + m[0].length;
                    front =
                        cardText.substring(0, deletionStart) +
                        "<span style='color:#2196f3'>[...]</span>" +
                        cardText.substring(deletionEnd);
                    front = front.replace(/==/gm, "");
                    back =
                        cardText.substring(0, deletionStart) +
                        "<span style='color:#2196f3'>" +
                        cardText.substring(deletionStart, deletionEnd) +
                        "</span>" +
                        cardText.substring(deletionEnd);
                    back = back.replace(/==/gm, "");
                    siblingMatches.push([front, back]);
                }
            } else {
                let idx: number;
                if (cardType === CardType.SingleLineBasic) {
                    idx = cardText.indexOf(this.data.settings.singlelineCardSeparator);
                    siblingMatches.push([
                        cardText.substring(0, idx),
                        cardText.substring(idx + this.data.settings.singlelineCardSeparator.length),
                    ]);
                } else if (cardType === CardType.SingleLineReversed) {
                    idx = cardText.indexOf(this.data.settings.singlelineReversedCardSeparator);
                    let side1: string = cardText.substring(0, idx),
                        side2: string = cardText.substring(
                            idx + this.data.settings.singlelineReversedCardSeparator.length
                        );
                    siblingMatches.push([side1, side2]);
                    siblingMatches.push([side2, side1]);
                } else if (cardType === CardType.MultiLineBasic) {
                    idx = cardText.indexOf("\n" + this.data.settings.multilineCardSeparator + "\n");
                    siblingMatches.push([
                        cardText.substring(0, idx),
                        cardText.substring(
                            idx + 2 + this.data.settings.multilineCardSeparator.length
                        ),
                    ]);
                } else if (cardType === CardType.MultiLineReversed) {
                    idx = cardText.indexOf(
                        "\n" + this.data.settings.multilineReversedCardSeparator + "\n"
                    );
                    let side1: string = cardText.substring(0, idx),
                        side2: string = cardText.substring(
                            idx + 2 + this.data.settings.multilineReversedCardSeparator.length
                        );
                    siblingMatches.push([side1, side2]);
                    siblingMatches.push([side2, side1]);
                }
            }

            let scheduling: RegExpMatchArray[] = [...cardText.matchAll(MULTI_SCHEDULING_EXTRACTOR)];
            if (scheduling.length === 0)
                scheduling = [...cardText.matchAll(LEGACY_SCHEDULING_EXTRACTOR)];

            // we have some extra scheduling dates to delete
            if (scheduling.length > siblingMatches.length) {
                let idxSched: number = cardText.lastIndexOf("<!--SR:") + 7;
                let newCardText: string = cardText.substring(0, idxSched);
                for (let i = 0; i < siblingMatches.length; i++)
                    newCardText += `!${scheduling[i][1]},${scheduling[i][2]},${scheduling[i][3]}`;
                newCardText += "-->";

                let replacementRegex = new RegExp(escapeRegexString(cardText), "gm");
                fileText = fileText.replace(replacementRegex, (_) => newCardText);
                fileChanged = true;
            }

            let context: string = this.data.settings.showContextInCards
                ? getCardContext(lineNo, headings)
                : "";
            let siblings: Card[] = [];
            for (let i = 0; i < siblingMatches.length; i++) {
                let front: string = siblingMatches[i][0].trim(),
                    back: string = siblingMatches[i][1].trim();

                let cardObj: Card = {
                    isDue: i < scheduling.length,
                    note,
                    lineNo,
                    front,
                    back,
                    cardText,
                    context,
                    cardType,
                    siblingIdx: i,
                    siblings,
                };

                // card scheduled
                if (i < scheduling.length) {
                    let dueUnix: number = window
                        .moment(scheduling[i][1], ["YYYY-MM-DD", "DD-MM-YYYY"])
                        .valueOf();
                    let nDays: number = Math.ceil((dueUnix - now) / (24 * 3600 * 1000));
                    if (!this.dueDatesFlashcards.hasOwnProperty(nDays)) {
                        this.dueDatesFlashcards[nDays] = 0;
                    }
                    this.dueDatesFlashcards[nDays]++;

                    let interval: number = parseInt(scheduling[i][2]),
                        ease: number = parseInt(scheduling[i][3]);
                    if (!this.cardStats.intervals.hasOwnProperty(interval)) {
                        this.cardStats.intervals[interval] = 0;
                    }
                    this.cardStats.intervals[interval]++;
                    if (!this.cardStats.eases.hasOwnProperty(ease)) {
                        this.cardStats.eases[ease] = 0;
                    }
                    this.cardStats.eases[ease]++;
                    totalNoteEase += ease;
                    scheduledCount++;

                    if (interval >= 32) {
                        this.cardStats.matureCount++;
                    } else {
                        this.cardStats.youngCount++;
                    }

                    if (this.data.buryList.includes(cardTextHash)) {
                        this.deckTree.countFlashcard([...deckPath]);
                        continue;
                    }

                    if (dueUnix <= now) {
                        cardObj.interval = interval;
                        cardObj.ease = ease;
                        cardObj.delayBeforeReview = now - dueUnix;
                        this.deckTree.insertFlashcard([...deckPath], cardObj);
                    } else {
                        this.deckTree.countFlashcard([...deckPath]);
                        continue;
                    }
                } else {
                    this.cardStats.newCount++;
                    if (this.data.buryList.includes(cyrb53(cardText))) {
                        this.deckTree.countFlashcard([...deckPath]);
                        continue;
                    }
                    this.deckTree.insertFlashcard([...deckPath], cardObj);
                }

                siblings.push(cardObj);
            }
        }

        if (fileChanged) {
            await this.app.vault.modify(note, fileText);
        }

        return scheduledCount > 0 ? totalNoteEase / scheduledCount : 0;
    }

    async loadPluginData(): Promise<void> {
        this.data = Object.assign({}, DEFAULT_DATA, await this.loadData());
        this.data = removeLegacyKeys(this.data, DEFAULT_DATA) as PluginData;
        this.data.settings = Object.assign({}, DEFAULT_SETTINGS, this.data.settings);
        this.data.settings = removeLegacyKeys(this.data.settings, DEFAULT_SETTINGS) as SRSettings;
    }

    async savePluginData(): Promise<void> {
        await this.saveData(this.data);
    }

    initView(): void {
        if (this.app.workspace.getLeavesOfType(REVIEW_QUEUE_VIEW_TYPE).length) {
            return;
        }

        this.app.workspace.getRightLeaf(false).setViewState({
            type: REVIEW_QUEUE_VIEW_TYPE,
            active: true,
        });
    }
}

function getCardContext(cardLine: number, headings: HeadingCache[]): string {
    let stack: HeadingCache[] = [];
    for (let heading of headings) {
        if (heading.position.start.line > cardLine) {
            break;
        }

        while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
            stack.pop();
        }

        stack.push(heading);
    }

    let context: string = "";
    for (let headingObj of stack) {
        headingObj.heading = headingObj.heading.replace(/\[\^\d+\]/gm, "").trim();
        context += headingObj.heading + " > ";
    }
    return context.slice(0, -3);
}
