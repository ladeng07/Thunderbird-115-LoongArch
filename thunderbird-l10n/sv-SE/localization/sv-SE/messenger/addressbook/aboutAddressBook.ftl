# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, you can obtain one at http://mozilla.org/MPL/2.0/.

about-addressbook-title = Adressbok

## Toolbar

about-addressbook-toolbar-new-address-book =
    .label = Ny adressbok
about-addressbook-toolbar-add-carddav-address-book =
    .label = Lägg till CardDAV-adressbok
about-addressbook-toolbar-add-ldap-address-book =
    .label = Lägg till LDAP-adressbok
about-addressbook-toolbar-new-contact =
    .label = Ny kontakt
about-addressbook-toolbar-new-list =
    .label = Ny lista
about-addressbook-toolbar-import =
    .label = Importera

## Books

all-address-books-row =
    .title = Alla adressböcker
all-address-books = Alla adressböcker
# Variables:
# $name (String) - The name of the selected book/list.
# $count (Number) - The number of contacts in the selected book/list.
about-addressbook-card-count = Totalt antal kontakter i { $name }: { $count }
# Variables:
# $count (Number) - The number of contacts in all address books.
about-addressbook-card-count-all = Totalt antal kontakter i alla adressböcker: { $count }
about-addressbook-books-context-properties =
    .label = Egenskaper
about-addressbook-books-context-edit-list =
    .label = Redigera lista
about-addressbook-books-context-synchronize =
    .label = Synkronisera
about-addressbook-books-context-edit =
    .label = Redigera
about-addressbook-books-context-print =
    .label = Skriv ut…
about-addressbook-books-context-export =
    .label = Exportera…
about-addressbook-books-context-delete =
    .label = Ta bort
about-addressbook-books-context-remove =
    .label = Ta bort
about-addressbook-books-context-startup-default =
    .label = Standardstartkatalog
about-addressbook-confirm-delete-book-title = Ta bort adressbok
# Variables:
# $name (String) - Name of the address book to be deleted.
about-addressbook-confirm-delete-book = Är du säker på att du vill ta bort { $name } och alla dess kontakter?
about-addressbook-confirm-remove-remote-book-title = Ta bort adressbok
# Variables:
# $name (String) - Name of the remote address book to be removed.
about-addressbook-confirm-remove-remote-book = Är du säker på att du vill ta bort { $name }?

## Cards

# Variables:
# $name (String) - Name of the address book that will be searched.
about-addressbook-search =
    .placeholder = Sök i { $name }
about-addressbook-search-all =
    .placeholder = Sök i alla adressböcker
about-addressbook-sort-button2 =
    .title = Lista visningsalternativ
about-addressbook-name-format-display =
    .label = Visningsnamn
about-addressbook-name-format-firstlast =
    .label = Förnamn Efternamn
about-addressbook-name-format-lastfirst =
    .label = Efternamn, Förnamn
about-addressbook-sort-name-ascending =
    .label = Sortera efter namn (A > Ö)
about-addressbook-sort-name-descending =
    .label = Sortera efter namn (Ö > A)
about-addressbook-sort-email-ascending =
    .label = Sortera efter e-postadress (A > Ö)
about-addressbook-sort-email-descending =
    .label = Sortera efter e-postadress (Ö > A)
about-addressbook-table-layout =
    .label = Tabellayout

## Card column headers
## Each string is listed here twice, and the values should match.

about-addressbook-column-header-generatedname2 = Namn
    .title = Sortera efter namn
about-addressbook-column-label-generatedname2 =
    .label = Namn
about-addressbook-column-header-emailaddresses2 = E-postadresser
    .title = Sortera efter e-postadresser
about-addressbook-column-label-emailaddresses2 =
    .label = E-postadresser
about-addressbook-column-header-nickname2 = Smeknamn
    .title = Sortera efter smeknamn
about-addressbook-column-label-nickname2 =
    .label = Smeknamn
about-addressbook-column-header-phonenumbers2 = Telefonnummer
    .title = Sortera efter telefonnummer
about-addressbook-column-label-phonenumbers2 =
    .label = Telefonnummer
about-addressbook-column-header-addresses2 = Adresser
    .title = Sortera efter adresser
about-addressbook-column-label-addresses2 =
    .label = Adresser
about-addressbook-column-header-title2 = Titel
    .title = Sortera efter titel
about-addressbook-column-label-title2 =
    .label = Titel
about-addressbook-column-header-department2 = Avdelning
    .title = Sortera efter avdelning
about-addressbook-column-label-department2 =
    .label = Avdelning
about-addressbook-column-header-organization2 = Organisation
    .title = Sortera efter organisation
about-addressbook-column-label-organization2 =
    .label = Organisation
about-addressbook-column-header-addrbook2 = Adressbok
    .title = Sortera efter adressbok
about-addressbook-column-label-addrbook2 =
    .label = Adressbok
about-addressbook-cards-context-write =
    .label = Skriv meddelande
about-addressbook-confirm-delete-mixed-title = Ta bort kontakter och listor
# Variables:
# $count (Number) - The number of contacts and lists to be deleted. Always greater than 1.
about-addressbook-confirm-delete-mixed = Är du säker på att du vill ta bort dessa { $count } kontakter och listor?
# Variables:
# $count (Number) - The number of lists to be deleted.
about-addressbook-confirm-delete-lists-title =
    { $count ->
        [one] Ta bort lista
       *[other] Ta bort listor
    }
# Variables:
# $count (Number) - The number of lists to be deleted.
# $name (String) - The name of the list to be deleted, if $count is 1.
about-addressbook-confirm-delete-lists =
    { $count ->
        [one] Är du säker på att du vill ta bort listan { $name }?
       *[other] Är du säker på att du vill ta bort dessa { $count } listor?
    }
# Variables:
# $count (Number) - The number of contacts to be removed.
about-addressbook-confirm-remove-contacts-title =
    { $count ->
        [one] Ta bort kontakt
       *[other] Ta bort kontakter
    }
# Variables:
# $name (String) - The name of the contact to be removed.
# $list (String) - The name of the list that contacts will be removed from.
about-addressbook-confirm-remove-contacts-single = Är du säker på att du vill ta bort { $name } från { $list }?
# Variables:
# $count (Number) - The number of contacts to be removed.
# $list (String) - The name of the list that contacts will be removed from.
about-addressbook-confirm-remove-contacts-multi =
    { $count ->
        [one] Är du säker på att du vill ta bort kontakten från { $list }?
       *[other] Är du säker på att du vill ta bort dessa { $count } kontakter från { $list }?
    }
# Variables:
# $count (Number) - The number of contacts to be deleted.
about-addressbook-confirm-delete-contacts-title =
    { $count ->
        [one] Ta bort kontakt
       *[other] Ta bort kontakter
    }
# Variables:
# $name (String) - The name of the contact to be deleted.
about-addressbook-confirm-delete-contacts-single = Är du säker på att du vill ta bort kontakten { $name }?
# Variables:
# $count (Number) - The number of contacts to be deleted.
about-addressbook-confirm-delete-contacts-multi =
    { $count ->
        [one] Är du säker på att du vill ta bort kontakten?
       *[other] Är du säker på att du vill ta bort dessa { $count } kontakter?
    }

## Card list placeholder
## Shown when there are no cards in the list

about-addressbook-placeholder-empty-book = Inga kontakter tillgängliga
about-addressbook-placeholder-new-contact = Ny kontakt
about-addressbook-placeholder-search-only = Den här adressboken visar endast kontakter efter en sökning
about-addressbook-placeholder-searching = Söker…
about-addressbook-placeholder-no-search-results = Inga kontakter hittades

## Details

# Variables:
# $count (Number) - The number of selected items (will never be fewer than 2).
about-addressbook-selection-mixed-header2 =
    { $count ->
        [one] { $count } vald adressbokspost
       *[other] { $count } valda adressboksposter
    }
# Variables:
# $count (Number) - The number of selected contacts
about-addressbook-selection-contacts-header2 =
    { $count ->
        [one] { $count } vald kontakt
       *[other] { $count } valda kontakter
    }
# Variables:
# $count (Number) - The number of selected lists
about-addressbook-selection-lists-header2 =
    { $count ->
        [one] { $count } vald lista
       *[other] { $count } valda listor
    }
about-addressbook-details-edit-photo =
    .title = Redigera kontaktfoto
about-addressbook-new-contact-header = Ny kontakt
about-addressbook-prefer-display-name = Föredra visningsnamn framför meddelandehuvud
about-addressbook-write-action-button = Skriv
about-addressbook-event-action-button = Händelse
about-addressbook-search-action-button = Sök
about-addressbook-new-list-action-button = Ny lista
about-addressbook-begin-edit-contact-button = Redigera
about-addressbook-delete-edit-contact-button = Ta bort
about-addressbook-cancel-edit-contact-button = Avbryt
about-addressbook-save-edit-contact-button = Spara
about-addressbook-add-contact-to = Lägg till:
about-addressbook-details-email-addresses-header = E-postadresser
about-addressbook-details-phone-numbers-header = Telefonnummer
about-addressbook-details-addresses-header = Adresser
about-addressbook-details-notes-header = Anteckningar
about-addressbook-details-impp-header = Snabbmeddelande
about-addressbook-details-websites-header = Webbplatser
about-addressbook-details-other-info-header = Annan information
about-addressbook-entry-type-work = Arbete
about-addressbook-entry-type-home = Hem
about-addressbook-entry-type-fax = Fax
# Or "Mobile"
about-addressbook-entry-type-cell = Mobiltelefon
about-addressbook-entry-type-pager = Personsökare
about-addressbook-entry-name-birthday = Födelsedag
about-addressbook-entry-name-anniversary = Årsdag
about-addressbook-entry-name-title = Titel
about-addressbook-entry-name-role = Roll
about-addressbook-entry-name-organization = Organisation
about-addressbook-entry-name-website = Webbplats
about-addressbook-entry-name-time-zone = Tidszon
about-addressbook-entry-name-custom1 = Anpassad 1
about-addressbook-entry-name-custom2 = Anpassad 2
about-addressbook-entry-name-custom3 = Anpassad 3
about-addressbook-entry-name-custom4 = Anpassad 4
about-addressbook-unsaved-changes-prompt-title = Osparade ändringar
about-addressbook-unsaved-changes-prompt = Vill du spara dina ändringar innan du lämnar redigeringsvyn?

# Photo dialog

about-addressbook-photo-drop-target = Släpp eller klistra in ett foto här eller klicka för att välja en fil.
about-addressbook-photo-drop-loading = Laddar foto…
about-addressbook-photo-drop-error = Det gick inte att ladda fotot.
about-addressbook-photo-filepicker-title = Välj en bildfil
about-addressbook-photo-discard = Ignorera befintligt foto
about-addressbook-photo-cancel = Avbryt
about-addressbook-photo-save = Spara

# Keyboard shortcuts

about-addressbook-new-contact-key = N
