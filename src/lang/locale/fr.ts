// Français

export default {
    // flashcard-modal.tsx
    DECKS: "Paquets",
    DUE_CARDS: "Cartes à réviser",
    NEW_CARDS: "Nouvelles cartes",
    TOTAL_CARDS: "Total cartes",
    BACK: "Retour",
    SKIP: "Passer",
    EDIT_CARD: "Modifier la carte",
    RESET_CARD_PROGRESS: "Réinitialiser l'avancement de la carte",
    HARD: "Difficile",
    GOOD: "Correct",
    EASY: "Facile",
    SHOW_ANSWER: "Afficher la réponse",
    CARD_PROGRESS_RESET: "L'avancement de la carte a été réinitialisé.",
    SAVE: "Enregistrer",
    CANCEL: "Annuler",
    NO_INPUT: "Aucune donnée nécessaire.",
    CURRENT_EASE_HELP_TEXT: "Aisance actuelle: ",
    CURRENT_INTERVAL_HELP_TEXT: "Intervalle actuel: ",
    CARD_GENERATED_FROM: "Généré à partir de: ${notePath}",

    // main.ts
    OPEN_NOTE_FOR_REVIEW: "Ouvrir une note pour la noter",
    REVIEW_CARDS: "Réviser les cartes",
    REVIEW_DIFFICULTY_FILE_MENU: "Noter: ${difficulty}",
    REVIEW_NOTE_DIFFICULTY_CMD: "Noter note comme ${difficulty}",
    CRAM_ALL_CARDS: "Sélectionner un paquet à enfouîr",
    REVIEW_ALL_CARDS: "Réviser les cartes de toutes les notes",
    REVIEW_CARDS_IN_NOTE: "Réviser les cartes de cette note",
    CRAM_CARDS_IN_NOTE: "Enfouir les cartes de cette note",
    VIEW_STATS: "Voir les statistiques",
    OPEN_REVIEW_QUEUE_VIEW: "Ouvrir l'espace de révision des notes dans la barre latérale",
    STATUS_BAR: "À réviser: ${dueNotesCount} note(s), ${dueFlashcardsCount} carte(s)",
    SYNC_TIME_TAKEN: "La synchronisation a pris ${t}ms",
    NOTE_IN_IGNORED_FOLDER: "La note est sauvegardée dans un dossier ignoré (vérifier les paramètres).",
    PLEASE_TAG_NOTE: "Veuillez étiqueter la note de façon appropriée pour réviser (dans les paramètres).",
    RESPONSE_RECEIVED: "Réponse reçue.",
    NO_DECK_EXISTS: "Aucun paquet n'existe pour ${deckName}",
    ALL_CAUGHT_UP: "Vous êtes à jour :D.",

    // scheduling.ts
    DAYS_STR_IVL: "${interval} jour(s)",
    MONTHS_STR_IVL: "${interval} mois",
    YEARS_STR_IVL: "${interval} année(s)",
    DAYS_STR_IVL_MOBILE: "${interval}j",
    MONTHS_STR_IVL_MOBILE: "${interval}m",
    YEARS_STR_IVL_MOBILE: "${interval}an(s)",

    // settings.ts
    SETTINGS_HEADER: "Plugin Spaced Repetition - Paramètres ",
    CHECK_WIKI: "Pour plus d'informations, vérifier la <a href='${wiki_url}'>documentation</a>.",
    FOLDERS_TO_IGNORE: "Dossiers à ignorer",
    FOLDERS_TO_IGNORE_DESC: "Entrer l'emplacement des dossiers séparés par un retour à la ligne (ex:Templates Meta/Scripts)",
    FLASHCARDS: "Cartes",
    FLASHCARD_EASY_LABEL: "Texte du bouton Facile",
    FLASHCARD_GOOD_LABEL: "Texte du bouton Correct",
    FLASHCARD_HARD_LABEL: "Texte du bouton Difficile",
    FLASHCARD_EASY_DESC: 'Personnaliser le texte pour le bouton "Facile"',
    FLASHCARD_GOOD_DESC: 'Personnaliser le texte pour le bouton "Correct"',
    FLASHCARD_HARD_DESC: 'Personnaliser le texte pour le bouton "Difficile"',
    FLASHCARD_TAGS: "Etiquettes des cartes",
    FLASHCARD_TAGS_DESC:
        "Entrer les étiquettes séparées par un retour à la ligne ou un espace (ex:#flashcards #deck2 #deck3).",
    CONVERT_FOLDERS_TO_DECKS: "Convertir les dossiers en paquets et sous-paquets ?",
    CONVERT_FOLDERS_TO_DECKS_DESC: "Ceci est une alternative aux étiquettes de cartes ci-dessus.",
    INLINE_SCHEDULING_COMMENTS:
        "Enregistrer le commentaire de planification sur la même ligne que la dernière ligne de la carte ?",
    INLINE_SCHEDULING_COMMENTS_DESC:
        "Activer ceci empêchera les commentaires HTML de détruire le format des listes.",
    BURY_SIBLINGS_TILL_NEXT_DAY: "Enfouir cartes identiques jusqu'au lendemain ?",
    BURY_SIBLINGS_TILL_NEXT_DAY_DESC:
        "Les cartes identiques sont générées par la même carte (ex: suppression d'un texte à trous)",
    SHOW_CARD_CONTEXT: "Montrer le contexte dans les cartes ?",
    SHOW_CARD_CONTEXT_DESC: "i.e. Titre > En-tête 1 > Sous-titre > ... > Sous-titre",
    CARD_MODAL_HEIGHT_PERCENT: "Hauteur des cartes (en pourcentage)",
    CARD_MODAL_SIZE_PERCENT_DESC:
        "Devrait être fixé à 100% sur mobile ou si vous avez de très grandes images.",
    RESET_DEFAULT: "Réinitialiser à la valeur par défaut",
    CARD_MODAL_WIDTH_PERCENT: "Largeur des cartes (en pourcentage)",
    RANDOMIZE_CARD_ORDER: "Randomiser l'odre des cartes durant les révisions ?",
    REVIEW_CARD_ORDER_WITHIN_DECK: "Les cartes ordonnées dans un paquet sont affichées durant les révisions",
    REVIEW_CARD_ORDER_NEW_FIRST_SEQUENTIAL: "Dans l'odre au sein d'un paquet (Nouvelles cardes en premier)",
    REVIEW_CARD_ORDER_DUE_FIRST_SEQUENTIAL: "Dans l'ordre au sein d'un paquet (Cartes à réviser en premier)",
    REVIEW_CARD_ORDER_NEW_FIRST_RANDOM: "Aléatoirement au sein d'un paquet (Nouvelles cardes en premier)",
    REVIEW_CARD_ORDER_DUE_FIRST_RANDOM: "Aléatoirement au sein d'un paquet (Cartes à réviser en premier)",
    REVIEW_CARD_ORDER_RANDOM_DECK_AND_CARD: "Carte aléatoire d'un paquet aléatoire",
    REVIEW_DECK_ORDER: "Les paquets ordonnés sont affichés durant les révisions",
    REVIEW_DECK_ORDER_PREV_DECK_COMPLETE_SEQUENTIAL:
        "Dans l'odre (une fois que toutes les cartes du paquet précédent ont été révisées)",
    REVIEW_DECK_ORDER_PREV_DECK_COMPLETE_RANDOM:
        "Aléatoirement (une fois que toutes les cartes du paquet précédent ont été révisées)",
    REVIEW_DECK_ORDER_RANDOM_DECK_AND_CARD: "Carte alétoire d'un paquet aléatoire",
    DISABLE_CLOZE_CARDS: "Désactiver les textes à trous ?",
    CONVERT_HIGHLIGHTS_TO_CLOZES: "Convertir ==surbrillance== en textes à trous ?",
    CONVERT_BOLD_TEXT_TO_CLOZES: "Convertir **texte en gras** en textes à trous ?",
    CONVERT_CURLY_BRACKETS_TO_CLOZES: "Convertir {{accolades}} en textes à trous ?",
    INLINE_CARDS_SEPARATOR: "Séparateur pour les cartes en une ligne",
    FIX_SEPARATORS_MANUALLY_WARNING:
        "Veuillez noter que vous devrez changer manuellement toute carte déjà produite en changeant ce paramétre.",
    INLINE_REVERSED_CARDS_SEPARATOR: "Séparateur pour les cartes en une ligne inversés",
    MULTILINE_CARDS_SEPARATOR: "Séparateur pour les cartes en plusieurs lignes",
    MULTILINE_REVERSED_CARDS_SEPARATOR: "Séparateur pour les cartes en plusieurs lignes inversé",
    NOTES: "Notes",
    REVIEW_PANE_ON_STARTUP: "Activer le panneau de révisions de notes",
    TAGS_TO_REVIEW: "Tags to review",
    TAGS_TO_REVIEW_DESC: "Enter tags separated by spaces or newlines i.e. #review #tag2 #tag3.",
    OPEN_RANDOM_NOTE: "Open a random note for review",
    OPEN_RANDOM_NOTE_DESC: "When you turn this off, notes are ordered by importance (PageRank).",
    AUTO_NEXT_NOTE: "Open next note automatically after a review",
    DISABLE_FILE_MENU_REVIEW_OPTIONS:
        "Disable review options in the file menu i.e. Review: Easy Good Hard",
    DISABLE_FILE_MENU_REVIEW_OPTIONS_DESC:
        "After disabling, you can review using the command hotkeys. Reload Obsidian after changing this.",
    MAX_N_DAYS_REVIEW_QUEUE: "Maximum number of days to display on right panel",
    MIN_ONE_DAY: "The number of days must be at least 1.",
    VALID_NUMBER_WARNING: "Please provide a valid number.",
    UI_PREFERENCES: "UI Preferences",
    INITIALLY_EXPAND_SUBDECKS_IN_TREE: "Deck trees should be initially displayed as expanded",
    INITIALLY_EXPAND_SUBDECKS_IN_TREE_DESC:
        "Turn this off to collapse nested decks in the same card. Useful if you have cards which belong to many decks in the same file.",
    ALGORITHM: "Algorithm",
    CHECK_ALGORITHM_WIKI:
        'For more information, check the <a href="${algo_url}">algorithm implementation</a>.',
    BASE_EASE: "Base ease",
    BASE_EASE_DESC: "minimum = 130, preferrably approximately 250.",
    BASE_EASE_MIN_WARNING: "The base ease must be at least 130.",
    LAPSE_INTERVAL_CHANGE: "Interval change when you review a flashcard/note as hard",
    LAPSE_INTERVAL_CHANGE_DESC: "newInterval = oldInterval * intervalChange / 100.",
    EASY_BONUS: "Easy Bonus",
    EASY_BONUS_DESC:
        "The easy bonus allows you to set the difference in intervals between answering Good and Easy on a flashcard/note (minimum = 100%).",
    EASY_BONUS_MIN_WARNING: "The easy bonus must be at least 100.",
    MAX_INTERVAL: "Maximum interval in days",
    MAX_INTERVAL_DESC: "Allows you to place an upper limit on the interval (default = 100 years).",
    MAX_INTERVAL_MIN_WARNING: "The maximum interval must be at least 1 day.",
    MAX_LINK_CONTRIB: "Maximum link contribution",
    MAX_LINK_CONTRIB_DESC:
        "Maximum contribution of the weighted ease of linked notes to the initial ease.",
    LOGGING: "Logging",
    DISPLAY_DEBUG_INFO: "Display debugging information on the developer console?",

    // sidebar.ts
    NOTES_REVIEW_QUEUE: "Notes Review Queue",
    CLOSE: "Close",
    NEW: "New",
    YESTERDAY: "Yesterday",
    TODAY: "Today",
    TOMORROW: "Tomorrow",

    // stats-modal.tsx
    STATS_TITLE: "Statistics",
    MONTH: "Month",
    QUARTER: "Quarter",
    YEAR: "Year",
    LIFETIME: "Lifetime",
    FORECAST: "Forecast",
    FORECAST_DESC: "The number of cards due in the future",
    SCHEDULED: "Scheduled",
    DAYS: "Days",
    NUMBER_OF_CARDS: "Number of cards",
    REVIEWS_PER_DAY: "Average: ${avg} reviews/day",
    INTERVALS: "Intervals",
    INTERVALS_DESC: "Delays until reviews are shown again",
    COUNT: "Count",
    INTERVALS_SUMMARY: "Average interval: ${avg}, Longest interval: ${longest}",
    EASES: "Eases",
    EASES_SUMMARY: "Average ease: ${avgEase}",
    CARD_TYPES: "Card Types",
    CARD_TYPES_DESC: "This includes buried cards as well, if any",
    CARD_TYPE_NEW: "New",
    CARD_TYPE_YOUNG: "Young",
    CARD_TYPE_MATURE: "Mature",
    CARD_TYPES_SUMMARY: "Total cards: ${totalCardsCount}",
};
