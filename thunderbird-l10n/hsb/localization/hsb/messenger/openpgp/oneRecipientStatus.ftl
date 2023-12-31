# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

openpgp-one-recipient-status-title =
    .title = Wěstota OpenPGP-powěsće
openpgp-one-recipient-status-status =
    .label = Status
openpgp-one-recipient-status-key-id =
    .label = ID kluča
openpgp-one-recipient-status-created-date =
    .label = Wutworjeny
openpgp-one-recipient-status-expires-date =
    .label = Płaćiwy do
openpgp-one-recipient-status-open-details =
    .label = Podrobnosće wočinić a akceptancu wobdźěłać…
openpgp-one-recipient-status-discover =
    .label = Nowy abo zaktualizowany kluč namakać

openpgp-one-recipient-status-instruction1 = Zo byšće přijimarjej powěsć zaklučowanu kónc do kónca pósłał, dyrbiće sej jeho zjawny OpenPGP-kluč wobstarać a jón jako akceptowany markěrować.
openpgp-one-recipient-status-instruction2 = Zo byšće jeho zjawny kluč dóstał, importujće jeho z mejlki, kotruž je wam pósłał a to jón zasadźi. Alternatiwnje móžeće spytać, jeho zjawny kluč w zapisu namakać.

openpgp-key-own = Akceptowany (wosobinski kluč)
openpgp-key-secret-not-personal = Njewužiwajomny
openpgp-key-verified = Akceptowany (wobkrućeny)
openpgp-key-unverified = Akceptowany (njewobkrućeny)
openpgp-key-undecided = Njeakceptowany (njerozsudźeny)
openpgp-key-rejected = Njeakceptowany (wotpokazany)
openpgp-key-expired = Spadnjeny

openpgp-intro = K dispoziciji stejace zjawne kluče za { $key }

openpgp-pubkey-import-id = ID: { $kid }
openpgp-pubkey-import-fpr = Porstowy wotćišć: { $fpr }

openpgp-pubkey-import-intro =
    { $num ->
        [one] Dataja { $num } zjawny kluč wobsahuje, kotryž so deleka pokazuje:
        [two] Dataja { $num } zjawnej klučej wobsahuje, kotrejž so deleka pokazujetej:
        [few] Dataja { $num } zjawne kluče wobsahuje, kotrež so deleka pokazuja:
       *[other] Dataja { $num } zjawnych klučow wobsahuje, kotrež so deleka pokazuja:
    }

openpgp-pubkey-import-accept =
    { $num ->
        [one] Akceptujeće tutón kluč za wšě pokazane e-mejlowe adresy, zo byšće digitalne signatury přepruwował a powěsće zaklučował?
        [two] Akceptujeće tutej klučej za wšě pokazane e-mejlowe adresy, zo byšće digitalne signatury přepruwował a powěsće zaklučował?
        [few] Akceptujeće tute kluče za wšě pokazane e-mejlowe adresy, zo byšće digitalne signatury přepruwował a powěsće zaklučował?
       *[other] Akceptujeće tute kluče za wšě pokazane e-mejlowe adresy, zo byšće digitalne signatury přepruwował a powěsće zaklučował?
    }

pubkey-import-button =
    .buttonlabelaccept = Importować
    .buttonaccesskeyaccept = I
