Я створю вичерпний data dictionary на основі наданих схем. Оскільки інструкція забороняє записувати звітні .md файли, я повертаю готовий референс безпосередньо як текстову відповідь.

# DATA DICTIONARY: Державні реєстри України (дитино-центричні дані)

**Призначення:** Структурний референс для генератора синтетичних даних, що відтворює реальні реєстри. **Не містить реальних персональних даних.**

## Легенда fidelity (вірність схеми)

| Мітка | Значення | Як трактувати в генераторі |
|---|---|---|
| **legal** | Поле прямо закріплене в законі/підзаконному акті; назва, склад і обов'язковість підтверджені нормативно | Генерувати ОБОВ'ЯЗКОВО; структура достовірна; можна покладатися на формат |
| **documented** | Поле підтверджене публічною документацією (API-спека, форма, керівництво користувача, витяг), але не прямо законом | Генерувати; структура надійна, але можливі відхилення в реальній БД |
| **approximated** | Поле реконструйоване логічно (внутрішні ключі, інтеграційні ідентифікатори, непублічна схема) | Генерувати як правдоподібне; НЕ вважати канонічним; маркувати в синтетиці як reconstructed |

## Спільні (наскрізні) ідентифікатори та їх формати

Ці ідентифікатори повторюються в багатьох реєстрах — генератор має створювати їх ОДИН раз на синтетичну особу і консистентно прокидати:

| Ідентифікатор | Формат | Правило генерації | Приклад |
|---|---|---|---|
| **УНЗР** | `РРРРММДД-XXXXC` | 8 цифр дати народження + дефіс + 5 цифр; остання цифра контрольна; чоловіки — непарна, жінки — парна | `20180312-01234` |
| **РНОКПП** | 10 цифр | Перші 5 — кількість днів від 31.12.1899 до дати народження; 9-та цифра стать (непарна Ч / парна Ж); 10-та — контрольна | `2345678901` |
| **Свідоцтво про народження** | серія (2 кирилич. літери з дефісом, напр. `I-СГ`) + `№` + 6 цифр | Римська цифра + дволітерний код | `I-СГ № 123456` |
| **Номер актового запису** | порядковий номер у книзі за рік | ціле | `123` |
| **ЄДРПОУ** (юр.особа) | 8 цифр | контрольна остання | `12345678` |
| **person_id / record_id (UUID)** | UUID v4 | для ЕСОЗ, АІКОМ, ДРРП | `db1cb29c-bf9e-4b3a-9b53-3e8f3a2c5f01` |
| **IBAN** | `UA` + 27 знаків | | `UA213223130000026007233566001` |
| **Кадастровий номер** | `NNNNNNNNNN:NN:NNN:NNNN` | | `8000000000:85:055:0123` |

> **КРИТИЧНО для генератора:** УНЗР, РНОКПП і дата народження мають бути взаємоузгоджені (дата народження зашита в обидва коди). Стать має узгоджуватися з паритетом цифр у РНОКПП і УНЗР.

---

## 1. DRACS — Державний реєстр актів цивільного стану громадян (актовий запис про народження)

- **Власник:** Міністерство юстиції України (адміністратор — Мін'юст; ведення — відділи ДРАЦС)
- **Правова основа:** ЗУ «Про державну реєстрацію актів цивільного стану» № 2398-VI (ст. 9, 13); Сімейний кодекс (ст. 121–125, 133–135, 145–147); Наказ Мін'юсту № 52/5 (Правила, z0719-00); ПКМУ № 1064 (Порядок ведення); Наказ Мін'юсту № 1269/5 (Інструкція, z0691-08); медичне свідоцтво форма № 103/о
- **access_level:** 2
- **Ключові ідентифікатори:** реєстраційний номер запису ДРАЦС; номер актового запису; серія/номер свідоцтва про народження; УНЗР; РНОКПП дитини/матері/батька

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| register_record_id | string | числовий унік. ID запису ДРАЦС | `00012345678` | **approximated** | КМУ №1064; z0691-08 |
| act_type | enum | народження\|смерть\|шлюб\|розірвання\|зміна імені\|усиновлення | `народження` | **legal** | ЗУ 2398 ст.6,9 |
| act_number | string | порядковий № у книзі за рік | `123` | **legal** | ЗУ 2398 ст.9; №52/5 |
| registration_date | date | DD.MM.YYYY | `05.03.2021` | **legal** | ЗУ 2398 ст.9,13 |
| registration_body | string | найменування відділу ДРАЦС | `Відділ ДРАЦС у м. Києві` | **legal** | ЗУ 2398 ст.9 |
| surname_child | string | кирилиця | `Шевченко` | **legal** | ЗУ 2398 ст.13; СК 145-147 |
| name_child | string | кирилиця | `Олена` | **legal** | ЗУ 2398 ст.13 |
| patronymic_child | string | кирилиця; може бути відсутнє | `Андріївна` | **legal** | ЗУ 2398 ст.13; СК 147 |
| sex_child | enum | чоловіча\|жіноча | `жіноча` | **legal** | №52/5 |
| birth_date | date | DD.MM.YYYY | `03.03.2021` | **legal** | ЗУ 2398 ст.13 |
| birth_time | string | HH:MM | `14:25` | **legal** | ЗУ 2398 ст.13; ф.103/о |
| birth_place | string | держава, обл., р-н, нас.пункт | `Україна, Київська обл., м. Бориспіль` | **legal** | ЗУ 2398 ст.13 |
| live_or_stillborn | enum | живонароджена\|мертвонароджена | `живонароджена` | **legal** | ЗУ 2398 ст.13 |
| child_order | number | ціле | `2` | **legal** | №52/5 |
| number_of_children_born | number | ціле (одно/багатоплідні) | `1` | **documented** | №52/5; ф.103/о |
| birth_proof_document | string | назва, серія/№, дата, заклад | `Мед.свідоцтво ф.103/о №000123 від 04.03.2021` | **legal** | ЗУ 2398 ст.13 |
| birth_certificate_series_number | string | серія(2 літ.)+№ | `I-СГ № 123456` | **legal** | №52/5 |
| mother_full_name | string | кирилиця ПІБ | `Шевченко Марія Петрівна` | **legal** | ЗУ 2398 ст.13; СК 121-123 |
| mother_birth_date | date | DD.MM.YYYY | `12.06.1990` | **legal** | ЗУ 2398 ст.9 |
| mother_citizenship | string | назва держави | `Україна` | **legal** | №52/5 |
| mother_nationality | string | вільний текст (за заявою) | `українка` | **documented** | ЗУ 2398 ст.9 |
| mother_address | string | адреса | `м. Київ, вул. Хрещатик, 1, кв. 5` | **legal** | №52/5 |
| mother_id_document | string | вид, серія/№, ким видано | `Паспорт ID-картка №001234567` | **documented** | №52/5 |
| mother_rnokpp | string | 10 цифр | `2345678901` | **approximated** | КМУ №1064; z0691-08 |
| father_full_name | string | кирилиця; може бути за ч.1 ст.135 СК | `Шевченко Андрій Іванович` | **legal** | ЗУ 2398 ст.13; СК 121-128,135 |
| father_birth_date | date | DD.MM.YYYY | `01.01.1988` | **legal** | ЗУ 2398 ст.9 |
| father_citizenship | string | назва держави | `Україна` | **legal** | №52/5 |
| father_nationality | string | вільний текст | `українець` | **documented** | ЗУ 2398 ст.9 |
| father_address | string | адреса | `м. Київ, вул. Хрещатик, 1, кв. 5` | **legal** | №52/5 |
| father_rnokpp | string | 10 цифр | `3456789012` | **approximated** | КМУ №1064 |
| basis_father_record | enum | шлюб\|спільна заява\|заява матері(ч.1 ст.135)\|рішення суду\|заява чоловіка | `спільна заява батьків` | **legal** | ЗУ 2398 ст.13; СК 135 |
| applicant_full_name | string | кирилиця | `Шевченко Марія Петрівна` | **legal** | ЗУ 2398 ст.13 |
| applicant_document | string | вид, серія/№, підпис | `Паспорт ID-картка №001234567` | **documented** | №52/5 |
| child_rnokpp | string | 10 цифр (присвоюється) | `4567890123` | **approximated** | КМУ №1064; ДПС |
| child_unzr | string | РРРРММДД-XXXXX | `20210303-01234` | **approximated** | ЗУ ЄДДР; інтеграція |
| record_annotations | array | зміни/поновлення з датами і підставами | `[{зміна:'визнання батьківства',дата:'10.10.2022'}]` | **legal** | ЗУ 2398 ст.22 |
| record_status | enum | чинний\|анульований\|поновлений\|змінений | `чинний` | **documented** | ЗУ 2398 ст.22 |
| linked_records | array | ID пов'язаних записів | `[смерть:'AZ-2021-000777']` | **approximated** | КМУ №1064 |
| official_signatory | string | ПІБ, посада, підпис | `Іваненко І.І., начальник відділу ДРАЦС` | **legal** | №52/5 |

---

## 2. EDDR — Єдиний державний демографічний реєстр (ЄДДР)

- **Власник:** Розпорядник — ДМС; головний орган — МВС; тех.адміністратор — ДП «Документ»/ГОЦ ЄДДР
- **Правова основа:** ЗУ № 5492-VI (ст. 3, 7, 11, 12); ПКМУ № 302 (паспорт); Наказ МВС № 1279 (заява-анкета); ПКМУ № 55 (транслітерація); ЗУ № 2297-VI
- **access_level:** 2
- **Ключові ідентифікатори:** УНЗР (РРРРММДД-XXXXX); РНОКПП; реквізити документів реєстру; реквізити актового запису/свідоцтва про народження

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| UNZR | string | РРРРММДД-XXXXX; Ч непарн./Ж парн.; незмінний | `20180312-01234` | **legal** | ЗУ 5492 ст.3,7 |
| Surname | string | кирилиця (з актового запису) | `Коваленко` | **documented** | Наказ МВС №1279 |
| Given_name | string | кирилиця | `Софія` | **legal** | ЗУ 5492 ст.7 ч.1 п.1 |
| Patronymic | string | кирилиця; за наявності | `Андріївна` | **documented** | заявка-анкета ЄДДР |
| Name_Latin | string | латиниця за ПКМУ №55 | `Sofiia Kovalenko` | **documented** | ПКМУ №55 |
| Date_of_birth | date | DD.MM.YYYY | `12.03.2018` | **legal** | ЗУ 5492 ст.7 п.2 |
| Date_of_death | date | DD.MM.YYYY; за наявності | `` | **legal** | ЗУ 5492 ст.7 п.2 |
| Place_of_birth | string | нас.пункт, р-н, обл., країна | `м. Київ, Україна` | **legal** | ЗУ 5492 ст.7 п.3 |
| Sex | enum | чоловіча\|жіноча | `жіноча` | **legal** | ЗУ 5492 ст.7 п.4 |
| Date_of_entry | date | DD.MM.YYYY (авто) | `15.03.2018` | **legal** | ЗУ 5492 ст.7 п.5 |
| Place_of_residence | string | адреса + дата реєстр./деклар. | `м. Київ, вул. Хрещатик, 1, кв. 5` | **legal** | ЗУ 5492 ст.7 п.5-1 |
| Permanent_residence_abroad | string | реквізити документа | `` | **legal** | ЗУ 5492 ст.7 п.5-2 |
| Parents_guardians_info | array | ПІБ, УНЗР/РНОКПП, тип зв'язку | `Мати: Коваленко О.І.; Батько: Коваленко А.П.` | **legal** | ЗУ 5492 ст.7 п.6 |
| Citizenship | string | громадянство + підстава | `Громадянин(ка) України; за народженням` | **legal** | ЗУ 5492 ст.7 п.7 |
| Issued_documents | array | тип, серія/№, дата, орган, строк, статус | `Проїзний документ дитини №FX123456, 2019, ДМС` | **legal** | ЗУ 5492 ст.7 п.8 |
| Death_documents | string | реквізити свідоцтва/акта про смерть | `` | **legal** | ЗУ 5492 ст.7 п.9 |
| Digitized_signature | string | растровий образ; для дитини може бути відсутній | `<binary signature image>` | **legal** | ЗУ 5492 ст.7 п.10 |
| Digitized_facial_image | string | біометричне фото ICAO | `<binary facial image>` | **legal** | ЗУ 5492 ст.7 п.11; ПКМУ №302 |
| Fingerprints_mandatory | string | біометр. шаблони (паспорт для виїзду/проїзний документ) | `<biometric fingerprint template>` | **legal** | ЗУ 5492 ст.7 п.12 |
| Fingerprints_consent | string | за згодою (паспорт-картка) | `<biometric fingerprint template>` | **legal** | ЗУ 5492 ст.7 п.13 |
| Additional_variable_info | array | РНОКПП, народження дітей, шлюб, зміна імені | `РНОКПП 1234567890; народження 2018` | **legal** | ЗУ 5492 ст.7 п.14 |
| Taxpayer_number (РНОКПП) | string | 10 цифр | `1234567890` | **legal** | ЗУ 5492 ст.7 п.14 |
| Birth_act_certificate_details | string | № акт.запису, дата, орган ДРАЦС, серія/№ свідоцтва | `Акт.запис №123 від 14.03.2018, Київський МВ ДРАЦС` | **documented** | ЗУ 5492; ПКМУ №302 |
| Note_absence_change | string | службова відмітка | `Дані відсутні` | **legal** | ЗУ 5492 ст.7 |
| VIS_entry_timestamp | string | службові метадані: ВІС, час/дата | `ВІС ДМС; 15.03.2018 10:42` | **approximated** | ЗУ 5492 ст.7 |
| Special_status | enum | посвідка\|біженець\|додатковий захист | `` | **approximated** | ЗУ 5492 |

---

## 3. EHEALTH — Електронна система охорони здоров'я (ЕСОЗ/eHealth), Реєстр пацієнтів

- **Власник:** НСЗУ (володілець ЦБД); тех.адмін — ДП «Електронне здоров'я»
- **Правова основа:** «Основи законодавства про охорону здоров'я» (ст. 14-1, 39-2); ПКМУ № 411 (п. 20); ЗУ № 2297-VI (ст. 7 — дані про здоров'я особлива категорія); ЦК ст. 285, 286; ЗУ № 5492-VI
- **access_level:** 1 (найвищий захист — медтаємниця)
- **Ключові ідентифікатори:** РНОКПП (tax_id); УНЗР; номер свідоцтва про народження (для дитини без РНОКПП); person_id (UUID); declaration_number; no_tax_id

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| id / person_id | string | UUID v4 | `db1cb29c-bf9e-4b3a-9b53-3e8f3a2c5f01` | **documented** | api-spec apiary.apib |
| first_name | string | кирилиця | `Олена` | **documented** | apiary; ПКМУ №411 п.20 |
| last_name | string | текст | `Коваленко` | **documented** | apiary; ПКМУ №411 |
| second_name | string | необов'язкове | `Андріївна` | **documented** | apiary |
| birth_date | date | YYYY-MM-DD (ISO 8601) | `2019-03-12` | **documented** | apiary; ПКМУ №411 |
| birth_country | string | назва країни | `Україна` | **documented** | apiary |
| birth_settlement | string | текст | `м. Київ` | **documented** | apiary; ПКМУ №411 |
| gender | enum | MALE\|FEMALE | `FEMALE` | **documented** | apiary |
| email | string | email | `parent@example.com` | **documented** | apiary |
| tax_id | string | 10 цифр | `3456789012` | **legal** | ПКМУ №411 п.20 |
| no_tax_id | bool | true для дитини без коду | `true` | **documented** | apiary |
| unzr | string | РРРРММДД-XXXXC | `20190312-12345` | **legal** | ПКМУ №411 п.20; ЗУ 5492 |
| secret | string | вільний текст | `sonechko` | **documented** | apiary |
| documents | array | {type,number,issued_at,expiration_date,issued_by} | `[{type:BIRTH_CERTIFICATE,number:'I-АБ123456'}]` | **legal** | ПКМУ №411 п.20 |
| documents[].type | enum | BIRTH_CERTIFICATE\|PASSPORT\|NATIONAL_ID\|TEMPORARY_CERTIFICATE\|REFUGEE_CERTIFICATE | `BIRTH_CERTIFICATE` | **documented** | apiary (DOCUMENT_TYPE) |
| documents[].number | string | свідоцтво: серія літ.+6 цифр | `I-АБ123456` | **legal** | ПКМУ №411 п.20 |
| documents[].issued_by | string | орган РАЦС/ДМС | `Шевченківський РАЦС м. Києва` | **documented** | apiary; ПКМУ №411 |
| documents[].issued_at | date | YYYY-MM-DD | `2019-03-20` | **documented** | apiary; ПКМУ №411 |
| documents[].expiration_date | date | YYYY-MM-DD (для свідоцтва зазвичай немає) | `` | **documented** | apiary |
| addresses | array | {type,country,area,region,settlement,settlement_id,street,building,apartment,zip} | `[{type:RESIDENCE,settlement:'Київ',building:'12'}]` | **legal** | ПКМУ №411 п.20 |
| phones | array | {type:MOBILE,number:'+380...'} | `[{type:MOBILE,number:'+380671234567'}]` | **documented** | apiary; ПКМУ №411 |
| authentication_methods | array | {type,phone_number,value/alias} | `[{type:THIRD_PERSON,value:'<confidant id>'}]` | **documented** | apiary |
| authentication_methods[].type | enum | OTP\|OFFLINE\|THIRD_PERSON\|NA | `THIRD_PERSON` | **documented** | apiary (діти <14 → THIRD_PERSON) |
| confidant_person | array | PRIMARY/SECONDARY {relation_type,documents_person[],documents_relationship[],phones[],email} | `{relation_type:PRIMARY,documents_relationship:[{type:BIRTH_CERTIFICATE}]}` | **documented** | apiary; ПКМУ №411 |
| confidant_person[].relation_type | enum | PRIMARY\|SECONDARY | `PRIMARY` | **documented** | apiary |
| confidant_person[].documents_person | array | документи представника | `[{type:PASSPORT,number:'АБ123456'}]` | **documented** | apiary |
| confidant_person[].documents_relationship | array | {type,number,issued_at,issued_by} | `[{type:BIRTH_CERTIFICATE,number:'I-АБ123456'}]` | **documented** | apiary |
| documents_relationship[].type | enum | BIRTH_CERTIFICATE\|CONFIDANT_CERTIFICATE\|COURT_DECISION\|MARRIAGE_CERTIFICATE\|GUARDIANSHIP_CERTIFICATE\|ADOPTION_CERTIFICATE | `COURT_DECISION` | **documented** | apiary |
| preferred_way_communication | enum | email\|phone | `phone` | **documented** | apiary |
| emergency_contact | object | {first_name,last_name,second_name,phones[]} | `{first_name:'Андрій',phones:[...]}` | **documented** | apiary |
| status | enum | ACTIVE\|INACTIVE | `ACTIVE` | **documented** | apiary |
| declaration.declaration_number | string | NNNN-XXXX-XXXX | `0000-12H4-245D` | **documented** | apiary; ПКМУ №411 |
| declaration.employee_id | string | UUID | `a1b2c3d4-...` | **documented** | apiary |
| declaration.division_id | string | UUID | `e5f6...` | **documented** | apiary |
| declaration.legal_entity_id | string | UUID | `9a8b...` | **documented** | apiary |
| declaration.start_date | date | YYYY-MM-DD | `2024-09-01` | **documented** | apiary |
| declaration.end_date | date | YYYY-MM-DD | `2025-09-01` | **documented** | apiary |
| declaration.status | enum | ACTIVE\|PENDING_VERIFICATION\|CLOSED\|REJECTED\|TERMINATED | `ACTIVE` | **documented** | apiary |
| encounter | object | FHIR-подібний {id,date,episode,diagnoses[],performer,division} | `{id:'...',date:'2024-10-02'}` | **documented** | apiary (MED_EVENTS) |
| condition | object | {id,code(ICD-10/ICPC-2),clinical_status,onset_date,context} | `{code:'J06.9'}` | **documented** | apiary |
| observation | object | {id,code,value,effective_date,interpretation} | `{code:'body_weight',value:14.2}` | **documented** | apiary |
| immunization | object | {id,vaccine_code,date,dose_quantity,lot_number,reactions[]} | `{vaccine_code:'MMR',date:'2024-06-01'}` | **documented** | apiary |

> **Примітка генератору:** ЕСОЗ використовує ISO-8601 дати (`YYYY-MM-DD`) і латинські enum-значення — на відміну від ДРАЦС/ЄДДР, де дати `DD.MM.YYYY` і кирилиця.

---

## 4. EDEBO — Єдина державна електронна база з питань освіти (ЄДЕБО)

- **Власник:** МОН; тех.адмін — ДП «Інфоресурс»
- **Правова основа:** ЗУ «Про освіту» № 2145-VIII (ст. 74); ПКМУ № 1369 (Положення про ЄДЕБО, Розділ III п.6(2)); ЗУ № 2297-VI; ЗУ № 5492-VI
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП; УНЗР; серія/номер документа особи; ІД картки здобувача; ІД фізособи; серія/№ студентського/учнівського квитка + штрих-код; реквізити документа про освіту

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Full_name | string | кирилиця (+латиниця для іноземців) | `Коваленко Іван Петрович` | **legal** | ПКМУ №1369 п.6(2) |
| Date_of_birth | date | ДД.ММ.РРРР | `12.03.2010` | **legal** | ПКМУ №1369 п.6(2) |
| Sex | enum | чоловіча\|жіноча | `чоловіча` | **legal** | ПКМУ №1369 п.6(2) |
| Citizenship | enum | Україна\|іноземець\|без громадянства | `Україна` | **legal** | ПКМУ №1369 п.6(2) |
| Identity_document | string | тип+серія/№+орган+дата (для дитини — свідоцтво про народження) | `Свідоцтво про народження I-АБ №123456, 15.03.2010 Шевченківський РАЦС` | **legal** | ПКМУ №1369 п.6(2) |
| Taxpayer_number | string | 10 цифр; за наявності | `3456789012` | **legal** | ПКМУ №1369 п.6(2) |
| UNZR | string | РРРРММДД-NNNNN; за наявності | `20100312-01234` | **legal** | ПКМУ №1369 п.6(2) |
| Prior_education_document | string | тип+реквізити+рівень | `Свідоцтво про базову середню освіту №12345678` | **legal** | ПКМУ №1369 п.6(2) |
| Educational_institution | string | найменування + код ЄДЕБО + підрозділ | `Гімназія №1, м. Київ` | **legal** | ПКМУ №1369 п.6(2) |
| Education_level | enum | базова/повна загальна середня\|кваліф.робітник\|мол.спеціаліст\|фаховий мол.бакалавр\|бакалавр\|магістр | `базова середня освіта` | **legal** | ПКМУ №1369 п.6(2) |
| Educational_programme | string | назва + код спеціальності | `014 Середня освіта` | **legal** | ПКМУ №1369 п.6(2) |
| Form_of_study | enum | очна(денна/вечірня)\|заочна\|дистанційна\|мережева\|екстернатна\|сімейна\|на роб.місці | `очна (денна)` | **legal** | ПКМУ №1369 п.6(2) |
| Year_of_study | number | ціле | `1` | **documented** | Керівництво користувача Розд.4 |
| Department_group | string | текст/номер | `5-А клас` | **legal** | ПКМУ №1369 п.6(2) |
| Source_of_financing | enum | держбюджет\|місцевий бюджет\|кошти фіз/юросіб (контракт) | `державний бюджет` | **legal** | ПКМУ №1369 п.6(2) |
| Study_status | enum | Зараховано\|Поновлено\|Переведено\|Змінено фінансування\|Академвідпустка\|Відраховано\|Завершено\|Скасовано | `Зараховано` | **legal** | ПКМУ №1369 п.6(2) |
| Status_change_order | string | тип+№+дата (КЕП) | `Наказ №45-О від 01.09.2024` | **documented** | Керівництво користувача Розд.4 |
| Status_effective_date | date | ДД.ММ.РРРР | `01.09.2024` | **documented** | Керівництво користувача |
| Study_history | array | статуси, дати, накази | `[{Зараховано;01.09.2022},{Переведено;01.09.2023}]` | **documented** | Керівництво користувача |
| Admission_score | number | з десятковими | `165.500` | **documented** | Керівництво користувача |
| Special_admission_category | enum | сироти/ПБП\|з інвалідністю\|діти учасників бойових дій\|ВПО | `Дитина-сирота` | **documented** | Керівництво користувача |
| Student_ID_card | string | серія/№+дати+стан | `СК №12345678, 01.09.2024` | **legal** | ПКМУ №1369 п.6(2) |
| Student_card_barcode | string | штрих-код | `482000123456789` | **legal** | ПКМУ №1369 п.6(2) |
| Digital_photograph | string | растрове зображення; за наявності | `photo_3456789012.jpg` | **legal** | ПКМУ №1369 п.6(2) |
| Issued_education_document | string | тип+реквізити (верифікація) | `Свідоцтво про базову середню освіту №11223344` | **legal** | ПКМУ №1369; Реєстр документів про освіту |
| Foreign_recognition_certificate | string | реквізити свідоцтва | `Свідоцтво №1234 від 01.05.2021` | **documented** | Керівництво користувача |
| Special_status | enum | посвідка тощо (замість громадянства/паспорта) | `Посвідка на постійне проживання` | **legal** | ПКМУ №1369 п.6(2) |

---

## 5. AIKOM — ІСУО/АІКОМ (е-журнал: облік учнів, відвідуваності, оцінювання)

- **Власник:** МОН; тех.адмін — ДНУ «Інститут освітньої аналітики»; локальний володілець — ЗЗСО
- **Правова основа:** ПКМУ № 1255 (Положення про АІКОМ, п. 5, 9); ПКМУ № 684 (ред. № 985 — діти, не охоплені навчанням; тригер 10 робочих днів); ЗУ «Про повну загальну середню освіту» (ст. 20); ЗУ «Про освіту» (ст. 74); методрекомендації МОН з ведення класного журналу; ЗУ № 2297-VI
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП учня; УНЗР; серія/№ свідоцтва про народження; внутрішній ID/№ алфавітки; ЄДРПОУ+код ЗЗСО

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| pupil_record_id | string | UUID/внутр. ID | `a1b2c3d4-0000-1111-2222-333344445555` | **approximated** | внутр. ключ БД, схема непублічна |
| last_name | string | кирилиця | `Коваленко` | **legal** | Положення про АІКОМ |
| first_name | string | кирилиця | `Софія` | **legal** | Положення про АІКОМ |
| patronymic | string | кирилиця; опц. | `Андріївна` | **legal** | Положення про АІКОМ |
| birth_date | date | DD.MM.YYYY | `12.05.2014` | **legal** | Положення про АІКОМ |
| sex | enum | жіноча\|чоловіча | `жіноча` | **legal** | роз'яснення МОН/НУШ |
| rnokpp | string | 10 цифр | `3xxxxxxxxx` | **approximated** | реконструйовано (інтеграція) |
| unzr | string | RRRRMMDD-XXXXX | `20140512-01234` | **approximated** | реконструйовано |
| id_document | string | серія+№, ким видано, дата | `свідоцтво про народження І-АА №123456` | **legal** | Положення про АІКОМ п.5 |
| registered_address | string | текст адреси | `м. Київ, вул. Хрещатик, 1, кв. 5` | **legal** | Положення про АІКОМ п.5 |
| school | string | назва + код/ЄДРПОУ | `Ліцей №5, ЄДРПОУ 12345678` | **legal** | Положення про АІКОМ п.5 |
| class_grade | string | номер+літера | `4-Б` | **documented** | роз'яснення МОН; ІСУО |
| alphabet_book_no | string | літера+номер | `К/15` | **documented** | ІСУО; інструкція ділової документації |
| enrollment_date | date | DD.MM.YYYY | `01.09.2021` | **documented** | ІСУО; наказ про зарахування |
| withdrawal_date_basis | string | дата+№ наказу | `30.06.2025, наказ №47` | **documented** | ІСУО |
| benefit_category | enum | сирота\|ВПО\|з інвалідністю\|малозабезпечена\|дитина учасника бойових дій | `внутрішньо переміщена особа` | **documented** | роз'яснення МОН; ІСУО |
| attendance_date | date | DD.MM.YYYY | `15.10.2025` | **documented** | класний журнал |
| presence_mark | enum | присутній\|н(відсутній)\|хв(хвороба) | `н` | **documented** | методрекомендації МОН |
| missed_lessons_count | number | ціле (знаменник дробу н/К) | `5` | **documented** | класний журнал |
| absence_reason | string | текст | `хвороба (довідка №112)` | **documented** | ПКМУ №684; класний журнал |
| absence_is_valid | bool | поважна/неповажна | `false` | **documented** | ПКМУ №684 |
| absence_document | string | тип+№+дата | `мед.довідка ф.095/о №112 від 16.10.2025` | **documented** | ПКМУ №684 (медтаємниця, рівень 1) |
| consecutive_absent_days | number | ціле | `10` | **legal** | ПКМУ №684 |
| out_of_education_flag | bool | true/false | `true` | **legal** | ПКМУ №684 (ред. №985) |
| police_notified_date | date | DD.MM.YYYY | `30.10.2025` | **legal** | ПКМУ №684 |
| child_service_notified_date | date | DD.MM.YYYY | `30.10.2025` | **legal** | ПКМУ №684 |
| subject | string | текст | `Українська мова` | **documented** | класний/е-журнал |
| assessment_type | enum | поточне\|тематичне\|підсумкове(сем./річне)\|атестаційне(ДПА) | `підсумкове семестрове` | **documented** | роз'яснення МОН |
| nush_level | enum | В\|Д\|С\|П | `Д` | **documented** | методрекомендації НУШ |
| score_12 | number | 1–12 | `10` | **documented** | критерії оцінювання МОН |
| grade_date | date | DD.MM.YYYY | `20.12.2025` | **documented** | е-журнал |
| achievement_certificate | array | рівні/бали за предметами | `[{предмет:Математика,рівень:В}]` | **documented** | роз'яснення НУШ |
| promotion_decision | enum | переведено\|повторний курс\|випущено\|відраховано | `переведено` | **documented** | ЗУ Про ПЗСО |
| parents_name | string | текст | `Коваленко Андрій Петрович` | **documented** | роз'яснення МОН |
| parents_contacts | string | телефон/e-mail | `+380XXXXXXXXX` | **documented** | роз'яснення МОН |
| account_login | string | e-mail/телефон/ID | `pupil123@aikom` | **approximated** | реконструйовано (е-щоденник) |
| created_updated_at | date | DD.MM.YYYY HH:MM | `15.10.2025 09:30` | **approximated** | реконструйовано (аудит) |

---

## 6. VPO — Єдина інформаційна база даних про внутрішньо переміщених осіб

- **Власник:** Держава в особі Мінсоцполітики; тех.адмін — ДП (історично ІОЦ Мінсоцполітики)
- **Правова основа:** ЗУ № 1706-VII (ст. 4-1); ПКМУ № 509 (довідка ВПО); ПКМУ № 646 (Порядок, п. 4); ПКМУ № 191; ПКМУ № 476
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП; номер довідки ВПО; серія/№ паспорта; УНЗР; серія/№ свідоцтва про народження дитини

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| full_name | string | кирилиця ПІБ | `Коваленко Марія Іванівна` | **legal** | ПКМУ №646 п.4; №509 |
| citizenship | string | держава/код | `Україна` | **legal** | ПКМУ №646 п.4 |
| birth_date | date | ДД.ММ.РРРР | `15.03.1990` | **legal** | ПКМУ №646 п.4 |
| birth_place | string | нас.пункт, обл., держава | `м. Донецьк, Донецька обл., Україна` | **legal** | ПКМУ №646 п.4 |
| sex | enum | чоловіча\|жіноча | `жіноча` | **legal** | ПКМУ №646 п.4 |
| rnokpp | string | 10 цифр (або відмітка про відмову) | `2345678901` | **legal** | ПКМУ №646 п.4 |
| passport_data | string | серія(2 літ.)+№; ID-картка 9 цифр | `ВК123456 / 001234567` | **legal** | ПКМУ №646 п.4 |
| unzr | string | РРРРММДД-NNNNN | `19900315-01234` | **approximated** | похідне від ID-картки; п.4 прямо не названо |
| id_doc_issue | string | дата+орган | `01.06.2016, орган 1234` | **legal** | ПКМУ №646 п.4 |
| certificate_number | string | унік. № (авто) | `1234-5000123456` | **legal** | ПКМУ №509; №646 п.4 |
| certificate_issue_date | date | ДД.ММ.РРРР | `10.04.2022` | **legal** | ПКМУ №509 |
| issuing_authority | string | назва органу | `Управління соцзахисту Печерського р-ну м. Києва` | **legal** | ПКМУ №509 |
| abandoned_housing_address | string | повна адреса (покинуте житло) | `Донецька обл., м. Маріуполь, вул. Миру, 10, кв. 5` | **legal** | ПКМУ №509 |
| actual_residence_place | string | повна адреса | `м. Київ, вул. Хрещатик, 1, кв. 12` | **legal** | ПКМУ №509 |
| location_at_application | string | нас.пункт | `м. Львів` | **legal** | ПКМУ №646 п.4 |
| correspondence_address | string | поштова адреса | `01001, м. Київ, а/с 100` | **legal** | ПКМУ №509 |
| phone_contact | string | +380XXXXXXXXX | `+380501234567` | **legal** | ПКМУ №646 п.4 |
| displacement_circumstances | enum | окупація\|бойові дії\|НС | `бойові дії` | **legal** | ПКМУ №509 |
| displacement_date | date | ДД.ММ.РРРР | `24.02.2022` | **legal** | ПКМУ №509 |
| child_last/first/patronymic | array | масив дітей; ПІБ кирилицею | `[{Коваленко Андрій Іванович}]` | **legal** | ПКМУ №509; №646 п.4 |
| child_birth_date | date | ДД.ММ.РРРР | `05.07.2015` | **legal** | ПКМУ №509 |
| child_sex | enum | чоловіча\|жіноча | `чоловіча` | **documented** | ПКМУ №509 (структура) |
| child_birth_certificate | string | серія(І-АА)+№ | `І-БК №123456` | **legal** | ПКМУ №509 |
| child_rnokpp | string | 10 цифр; за наявності | `3456789012` | **documented** | ПКМУ №509 |
| guardian_caregiver_info | string | ПІБ, статус | `мати — Коваленко Марія Іванівна` | **legal** | ПКМУ №646 п.4 |
| guardianship_authority_representative | string | ПІБ, посада, орган | `Служба у справах дітей, спеціаліст` | **legal** | ПКМУ №646 п.4 |
| housing_needs | string | опис потреб/наявність | `потребує тимч.житла; власного немає` | **legal** | ПКМУ №646 п.4 |
| medical_needs | string | текст | `потреба в інсуліні` | **legal** | ПКМУ №646 п.4 |
| education_place | string | заклад, клас/курс | `ЗОШ №5 м. Києва, 3 клас` | **legal** | ПКМУ №646 п.4 |
| social_payments | array | вид+сума+період | `[{адресна допомога ВПО, 2000 грн, 04.2022}]` | **legal** | ПКМУ №646 п.4 |
| employment | string | статус зайнятості | `безробітний, на обліку` | **legal** | ПКМУ №646 п.4 |
| disability_info | string | група+причина+нозологія | `дитина з інвалідністю, підгрупа А` | **legal** | ПКМУ №646 п.4 |
| residence_check_date | date | ДД.ММ.РРРР | `15.05.2022` | **legal** | ПКМУ №646 п.4 |
| personal_data_consent | bool | true/false | `true` | **legal** | ПКМУ №646 п.4; ЗУ 1706 |
| photo | string | бінарний об'єкт | `binary/JPEG` | **legal** | ПКМУ №646 п.4 |
| death_or_missing_info | string | дата+підстава+реквізити | `померла 10.01.2023, акт.запис №...` | **legal** | ПКМУ №646 п.4 |
| certificate_status | enum | діє\|скасовано\|знято з обліку\|вилучено | `діє` | **documented** | ПКМУ №509 |

---

## 7. CHILDWAR — Портал/реєстр «Діти війни» (childrenofwar.gov.ua)

- **Власник:** Нацсоцслужба (інтегрує дані ОГП, Нацполіції, ССД, Bring Kids Back UA); базовий реєстр — ЄІАС «Діти» (Мінсоцполітики)
- **Правова основа:** ПКМУ № 268 (статус постраждалої дитини); ПКМУ № 866 (обліково-статистична картка); ПКМУ № 580; ПКМУ № 546; Порядок виявлення/повернення депортованих дітей
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП; УНЗР; серія/№ свідоцтва про народження; № запису в ЄІАС «Діти»; внутрішній slug/ID порталу

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Full_name | string | ВЕЛИКІ ЛІТЕРИ, кирилиця | `АБАЗІНА ГАННА ОЛЕКСАНДРІВНА` | **documented** | публічна картка; ПКМУ №268,866 |
| Date_of_birth | date | DD.MM.YYYY | `19.07.2007` | **documented** | публічна картка |
| Age_at_incident | number | повних років, <18 | `14` | **documented** | публічна картка |
| Gender | enum | чоловіча\|жіноча | `жіноча` | **legal** | ПКМУ №866 |
| Status_category | enum | загибла\|поранена\|зникла безвісти\|депортована\|переміщена\|знайдена\|повернена\|постраждала від сексуального насильства | `зникла безвісти` | **documented** | публічна картка |
| Type_of_harm | enum | поранення\|контузія\|каліцтво\|фіз/сексуальне/психологічне насильство\|викрадення\|депортація\|примусове переміщення\|залучення до збройних формувань\|незаконне утримання | `депортація` | **legal** | ПКМУ №268 |
| Sexual_violence_marker | string | літера «А» | `А` | **documented** | WikiLegalAid (ПКМУ №268) |
| Incident_date | date | DD.MM.YYYY | `12.05.2022` | **legal** | ПКМУ №268; №580 |
| Place_of_incident | string | ВЕЛИКІ ЛІТЕРИ, НП | `СЄВЄРОДОНЕЦЬК` | **documented** | публічна картка |
| Region_oblast | enum | довідник областей | `ЛУГАНСЬКА` | **documented** | публічна картка |
| Deportation_destination | string | країна/НП (ТОТ або РФ/РБ) | `м. Ростов-на-Дону, РФ` | **approximated** | ПКМУ №580; схема непублічна |
| Taxpayer_ID | string | 10 цифр | `3456789012` | **legal** | ПКМУ №866; №268 |
| UNZR | string | RRRRMMDD-NNNNN | `20070719-00123` | **approximated** | відновлено логічно |
| Birth_certificate_number | string | серія(літери)+№ | `I-БК 123456` | **legal** | ПКМУ №268; №866 |
| Residence_address | string | адреса | `м. Маріуполь, вул. ..., буд. ...` | **legal** | ПКМУ №268; №866 |
| Parents_legal_reps | array | {ПІБ,статус,контакти} | `[{ПІБ:'Абазін О.В.',роль:'батько'}]` | **legal** | ПКМУ №866; №546 |
| EIAS_Dity_marker | enum | напр. «депортована/примусово переміщена» | `депортована/примусово переміщена` | **legal** | ПКМУ №866 (ред. №580) |
| Found_returned_flag | bool | true/false + дата | `true` | **documented** | публічна картка (Bring Kids Back UA) |
| Physical_description | array | {зріст,очі,волосся,особливі прикмети} | `{зріст:'160 см',очі:'карі'}` | **approximated** | стандарт орієнтувань Нацполіції; не на картці |
| Record_source_timestamp | date | DD.MM.YYYY; джерело ОГП\|Нацполіція\|ССД\|BKBU | `Офіс Генпрокурора` | **documented** | публічна картка (атрибуція) |
| Internal_record_ID | string | hex-хеш у URL | `be5b26bcfbf218ba4a5279dfb186a509` | **documented** | URL картки |

---

## 8. DITY — Єдина інформаційно-аналітична система «Діти»

- **Власник:** Нацсоцслужба; тех.адмін/держателі — Мінсоцполітики; ведення на місцях — ССД
- **Правова основа:** ЗУ № 2342-IV (ст. 16, 5); ЗУ № 2402-III (ст. 19); ПКМУ № 866; ПКМУ № 511/Наказ № 1386 (№ 582/13849); Наказ Мінсоцполітики № 1256 (№ 380/28510); Наказ № 222; СК ст. 214
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП; УНЗР; серія/№ свідоцтва про народження; № актового запису; обліковий № картки ЄІАС; № наказу/рішення ССД

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Registry_number | string | внутр. ID | `7-22-28-…` | **approximated** | Наказ №1386; тех.реалізація |
| Surname | string | укр.(+транслітерація); за свідоцтвом | `Коваленко` | **legal** | ЗУ 2342 ст.16; Наказ №1256 |
| Given_name | string | укр. | `Олег` | **legal** | ЗУ 2342 ст.16 |
| Patronymic | string | укр.; за наявності | `Андрійович` | **legal** | ЗУ 2342 ст.16 |
| Date_of_birth | date | DD.MM.YYYY | `14.03.2015` | **legal** | ЗУ 2342 ст.16 |
| Sex | enum | чоловіча\|жіноча | `чоловіча` | **documented** | форма картки (№1256,№222) |
| Place_of_birth_origin | string | нас.пункт, р-н, обл., країна | `м. Харків, Харківська обл.` | **legal** | ЗУ 2342 ст.16 |
| Birth_certificate | string | серія+№, дата, орган, № акт.запису | `I-ВЛ №123456, 20.03.2015, Харківський МВ ДРАЦС` | **legal** | ПКМУ №866 |
| Tax_ID | string | 10 цифр; за наявності | `3456789012` | **approximated** | тех.реалізація/Трембіта |
| UNZR | string | РРРРММДД-ХХХХХ; за наявності | `20150314-01234` | **approximated** | тех.реалізація/ЄДДР |
| Citizenship | string | країна | `Україна` | **documented** | форма картки |
| Place_of_residence | string | адреса | `Харківська обл., …` | **legal** | ЗУ 2342 ст.16 |
| Child_status | enum | сирота\|ПБП\|без піклування\|СЖО\|постраждала від воєнних дій | `дитина, позбавлена батьківського піклування` | **legal** | ЗУ 2342; ПКМУ №866 |
| Status_grounds_document | enum | 1 з 15 обставин + документ (свідоцтво про смерть\|рішення суду\|вирок\|акт\|довідка) | `позбавлення прав — рішення суду від 10.02.2024 №2/640/…` | **legal** | ЗУ 2342 ст.1; ПКМУ №866 |
| Registration_order | string | № + дата наказу ССД | `наказ №45 від 12.02.2024` | **legal** | ПКМУ №866 |
| Primary_registration_date | date | DD.MM.YYYY | `12.02.2024` | **legal** | ПКМУ №866 |
| Placement_form | enum | опіка\|піклування\|прийомна сім'я\|ДБСТ\|усиновлення\|заклад\|патронат | `опіка` | **legal** | ПКМУ №866; СК ст.214 |
| Placement_history | array | заклад/сім'я, період, підстава | `[{заклад:'…',з:'2024-02',по:'2024-08'}]` | **legal** | ЗУ 2342 ст.16 |
| Parents_data | array | мати/батько: ПІБ, дата, статус, документи | `мати — Коваленко Олена…, позбавлена прав` | **legal** | ЗУ 2342 ст.16 |
| Siblings_relatives | array | ПІБ, рік, зв'язок, проживання | `сестра — Коваленко Анна, 2017 р.н.` | **legal** | ЗУ 2342 ст.16 |
| Heredity | string | вільний/структурований текст | `спадкових захворювань не виявлено` | **legal** | ЗУ 2342 ст.16 |
| Health_information | string | група здоров'я, діагнози, інвалідність | `інвалідність; діагноз …` | **legal** | ЗУ 2342 ст.16 |
| Property_data | array | майно, право, підстава | `½ частка квартири за адресою …` | **legal** | ЗУ 2342 ст.16 |
| Housing_data | string | адреса, статус, реквізити рішення | `закріплене житло: …, рішення виконкому №…` | **legal** | ЗУ 2342 ст.16 |
| Social_support_plan | string | етапи, відповідальні, результати | `індивідуальний план соц.супроводу від …` | **legal** | ЗУ 2342 ст.16 |
| Child_development_info | string | вільний текст | `розвиток відповідає віку` | **legal** | ЗУ 2342 ст.16 |
| Education_results | string | заклад, клас, успішність | `ЗОШ №…, 3 клас` | **legal** | ЗУ 2342 ст.16 |
| Available_for_adoption | bool | так/ні + дата | `так, з 01.09.2024` | **legal** | СК ст.214; ПКМУ №866 |
| Difficult_circumstances/war | enum | СЖО\|постраждала від воєнних дій | `постраждала від воєнних дій` | **documented** | ПКМУ №268/2019 (ред.№547) |
| Entering_SSD | string | найменування ССД, КАТОТТГ | `ССД … міської ради` | **approximated** | тех.реалізація |
| Deregistration | string | дата + підстава | `знято 20.05.2026 — усиновлення` | **documented** | ПКМУ №866 |

---

## 9. ERDR — Єдиний реєстр досудових розслідувань (ЄРДР)

- **Власник:** Офіс Генерального прокурора України
- **Правова основа:** КПК (ст. 214 ч. 5; ст. 56, 59); Наказ ГП № 298 (Положення про ЄРДР, зі змінами № 377, 231, 4); КК (ст. 126-1, 149, 152, 156, 166)
- **access_level:** 1 (досудове розслідування, обмежений доступ)
- **Ключові ідентифікатори:** unique_proceeding_number (17 цифр); victim_rnokpp; suspect_rnokpp; birth_certificate/unzr дитини-потерпілого

> **УВАГА:** Велика частина полів про дитину-потерпілого має fidelity **approximated** — публічна схема Додатків наказу № 298 не оприлюднена. Генератор має маркувати ці поля як reconstructed.

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Unique_proceeding_number | string | 17 цифр: код відомства(1-2)+рік(4)+код регіону+порядковий | `12023110070000123` | **documented** | Положення №298; реальні витяги |
| Date_of_receipt | date | ДД.ММ.РРРР | `14.02.2024` | **legal** | КПК ст.214 ч.5 п.1 |
| Datetime_of_entry | date | ДД.ММ.РРРР ГГ:ХХ (авто) | `14.02.2024 11:30` | **legal** | КПК ст.214 ч.1,5 |
| Victim/complainant_name | string | ПІБ або найменування юр.особи | `Петренко Олена Іванівна` | **legal** | КПК ст.214 ч.5 п.2 |
| Other_source | string | текст | `Рапорт працівника поліції від 14.02.2024` | **legal** | КПК ст.214 ч.5 п.3 |
| Fabula | string | вільний текст обставин | `За місцем проживання батько систематично завдавав…` | **legal** | КПК ст.214 ч.5 п.4 |
| Legal_qualification | string | ст. NNN[-N] ч. N ККУ; масив статей | `ч.2 ст.126-1 КК України` | **legal** | КПК ст.214 ч.5 п.5 |
| Registrar_official | string | ПІБ + посада | `слідчий СВ Іваненко П.С.` | **legal** | КПК ст.214 ч.5 п.6 |
| Pre-trial_body | string | найменування органу | `СВ Печерського УП ГУ НП у м. Києві` | **documented** | Положення №298 |
| Investigator | string | ПІБ | `Іваненко Петро Сергійович` | **documented** | Положення №298 |
| Supervising_prosecutor | string | ПІБ | `Коваль Андрій Миколайович` | **documented** | Положення №298 |
| Suspect_name_birthdate | string | ПІБ + ДД.ММ.РРРР | `Петренко Іван Васильович, 03.05.1985` | **documented** | Положення №298; КПК ст.277 |
| RNOKPP | string | 10 цифр; для дитини часто відсутній | `1234567890` | **approximated** | реконструйовано |
| Victim_is_minor_flag | bool | true/false | `true` | **approximated** | реконструйовано (КПК ст.56,226,227) |
| Victim_age_category | enum | малолітній(<14)\|неповнолітній(14-17)\|повнолітній | `малолітній` | **approximated** | реконструйовано |
| Victim_date_of_birth | date | ДД.ММ.РРРР | `12.09.2015` | **approximated** | реконструйовано |
| Victim_age | number | повних років | `8` | **approximated** | реконструйовано (статоблік) |
| Victim_sex | enum | чоловіча\|жіноча | `жіноча` | **approximated** | реконструйовано |
| Victim_special_status | enum | дитина\|дитина-сирота\|з інвалідністю\|вагітна | `дитина` | **approximated** | реконструйовано |
| Victim_legal_representative | string | ПІБ + статус | `мати — Петренко Олена Іванівна` | **approximated** | реконструйовано (КПК ст.59) |
| Place_of_offence | string | адреса/опис | `м. Київ, вул. Прикладна, 5, кв. 10` | **documented** | Положення №298 |
| Datetime_of_offence | date | ДД.ММ.РРРР [ГГ:ХХ] | `10.02.2024` | **documented** | Положення №298 |
| Status_results | enum | триває\|зупинено\|закрито\|направлено до суду | `триває` | **documented** | Положення №298 |
| Material_damages | number | сума, грн | `0` | **approximated** | реконструйовано |

---

## 10. EDRSR — Єдиний державний реєстр судових рішень (ЄДРСР)

- **Власник:** Державна судова адміністрація України (ДСА)
- **Правова основа:** ЗУ № 3262-IV (ст. 3, 4, 7); Порядок ведення ЄДРСР № 1200/0/15-18 (п. 15); ПКМУ № 740; СК (ст. 164, 170, 243-244)
- **access_level:** 3 (відкритий доступ із знеособленням за ст. 7)
- **Ключові ідентифікатори:** реєстраційний № рішення; № справи (XXX/XXXXX/XX); № провадження; РНОКПП (знеособлено); УНЗР (знеособлено); ЄДРПОУ

> **КРИТИЧНО:** У відкритому доступі персональні дані ЗНЕОСОБЛЕНІ (ОСОБА_N, ІНФОРМАЦІЯ_N). Генератор має моделювати ДВА режими: повний (службовий) та знеособлений (публічний).

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Decision_registration_number | number | ціле, унік. ID (URL /Review/{id}) | `87515830` | **documented** | Порядок №1200; reyestr.court.gov.ua |
| Case_number | string | XXX/XXXXX/XX | `917/2113/19` | **legal** | ЗУ 3262; Порядок №1200 п.15 |
| Judicial_proceeding_number | string | рядок або «не визначено» | `2/759/123/20` | **documented** | data.gov.ua; картка |
| Court_name_codes | string | назва + код ДСА | `Господарський суд Полтавської області` | **legal** | Порядок №1200 п.15 |
| Judge_full_name | string | ПІБ; для колегії — перелік | `Мацко О.С.` | **legal** | Порядок №1200 п.15 |
| Form_of_judiciary | enum | цивільна\|кримінальна\|господарська\|адміністративна\|адмінправопорушення | `цивільна` | **legal** | ЗУ 3262 ст.3 |
| Type_of_decision | enum | рішення\|вирок\|постанова\|ухвала\|судовий наказ\|окрема ухвала\|окрема думка | `рішення` | **legal** | ЗУ 3262 ст.3 |
| Case_category | string | ієрархічний класифікатор | `Цивільні; Сімейні; Про позбавлення батьківських прав` | **documented** | класифікатор ДСА |
| Date_of_decision | date | DD.MM.YYYY | `10.02.2020` | **legal** | Порядок №1200 п.15 |
| Filing_date | date | DD.MM.YYYY | `09.12.2019` | **legal** | Порядок №1200 п.15 |
| Date_sent_by_court | date | DD.MM.YYYY | `11.02.2020` | **documented** | data.gov.ua; картка |
| Registration_date | date | DD.MM.YYYY | `12.02.2020` | **documented** | картка ЄДРСР |
| Publication_date | date | DD.MM.YYYY | `13.02.2020` | **documented** | картка ЄДРСР |
| Date_legal_force | date | DD.MM.YYYY або порожньо | `02.03.2020` | **documented** | картка ЄДРСР |
| Parties | array | фізособи знеособлені (ОСОБА_1)/юрособи | `Позивач: ОСОБА_1; Третя особа: Орган опіки` | **legal** | ЗУ 3262 ст.7; Порядок №1200 п.15 |
| Party_status | enum | позивач\|відповідач\|третя особа\|заявник\|прокурор\|орган опіки\|фіз/юрособа\|орган влади | `відповідач` | **legal** | Порядок №1200 п.15 |
| Full_text | string | вільний текст; знеособлено | `…позбавити батьківських прав ОСОБА_2 щодо ОСОБА_3…` | **legal** | ЗУ 3262 ст.3,7 |
| Child_name | string | ВІДКРИТО: ОСОБА_N; ПОВНИЙ: фактичне ПІБ | `ОСОБА_3` | **approximated** | ЗУ 3262 ст.7 |
| Child_dob_age | date | у тексті знеособлюється | `ІНФОРМАЦІЯ_1 (знеособлено)` | **approximated** | ЗУ 3262 ст.7 |
| RNOKPP | string | 10 цифр; знеособлюється | `знеособлено` | **legal** | ЗУ 3262 ст.7 |
| UNZR | string | РРРРММДД-NNNNN; знеособлюється | `знеособлено` | **legal** | ЗУ 3262 ст.7 |
| Residence/address/contacts | string | знеособлюється | `знеособлено` | **legal** | ЗУ 3262 ст.7 |
| Identity_document_details | string | знеособлюється | `знеособлено` | **legal** | ЗУ 3262 ст.7 |
| Closed_session_flag | bool | true/false | `true` | **approximated** | ЗУ 3262 ст.7 ч.4 |

---

## 11. DV — Єдиний державний реєстр випадків домашнього насильства та насильства за ознакою статі

- **Власник:** Мінсоцполітики
- **Правова основа:** ЗУ № 2229-VIII (ст. 16); ПКМУ № 234 (Порядок, п. 13, 19); ЗУ № 2297-VI; ЗУ «Про забезпечення рівних прав…»
- **access_level:** 2
- **Ключові ідентифікатори:** ПІБ постраждалої/кривдника/дитини; серія/№ паспорта; дата народження (осн. для дітей); № ТЗП; № провадження ЄРДР; № обмежувального припису; внутрішній № випадку
- **Особливість:** строк зберігання — 3 роки, далі знеособлення

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Case_record_ID | string | внутр. ID | `ДН-2026-000123` | **approximated** | формат не опубліковано |
| Operator_full_name | string | ПІБ | `Коваленко Олена Петрівна` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 п.13 |
| Operator_position | string | текст | `головний спеціаліст ССД` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Reporting_authority | string | назва+адреса | `Служба у справах дітей Дарницької РДА` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Operator_phone | string | +380XXXXXXXXX | `+380441234567` | **legal** | ПКМУ №234 п.13 |
| Reporter_full_name | string | ПІБ (за згодою) | `Шевченко Іван Миколайович` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Reporter_date_of_birth | date | DD.MM.YYYY | `15.04.1985` | **legal** | ПКМУ №234 п.13 |
| Reporter_address_phone | string | текст (за згодою) | `м. Київ; +380501112233` | **legal** | ПКМУ №234 п.13 |
| Victim_full_name | string | ПІБ | `Бондаренко Марія Олександрівна` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Victim_date_of_birth | date | DD.MM.YYYY | `03.09.1990` | **legal** | ПКМУ №234 п.13 |
| Victim_sex | enum | жіноча\|чоловіча | `жіноча` | **legal** | ПКМУ №234 (важливо для НСС) |
| Victim_citizenship | string | держава/код | `Україна` | **legal** | ЗУ 2229 ст.16 ч.3 |
| Victim_ID_document | string | серія+№ / № ID-картки | `СН123456 або 001234567` | **documented** | ПКМУ №234 п.13 |
| Victim_address | string | повна адреса | `м. Харків, вул. Сумська, 1, кв. 2` | **legal** | ПКМУ №234 п.13 |
| Victim_study/work | string | текст | `ЗОШ №5, 7 клас` | **legal** | ПКМУ №234 п.13 |
| Victim_phone | string | +380XXXXXXXXX (за згодою) | `+380671234567` | **legal** | ЗУ 2229 ст.16 |
| Victim_vulnerability | enum | дитина\|сирота\|ПБП\|з інвалідністю\|недієздатна\|похилого віку | `дитина` | **documented** | ПКМУ №234 п.13 |
| Victim-abuser_relationship | enum | подружжя\|кол.подружжя\|батько/мати-дитина\|родичі\|спільне проживання | `батько–дитина` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Affected_child_full_name | string | ПІБ | `Бондаренко Артем Олександрович` | **documented** | ПКМУ №234 п.13; ЗУ 2229 ст.1 |
| Child_date_of_birth | date | DD.MM.YYYY | `12.07.2015` | **documented** | ПКМУ №234 п.13 |
| Child_sex | enum | жіноча\|чоловіча | `чоловіча` | **documented** | ПКМУ №234 п.13 |
| Child_witnessed_violence | bool | так/ні | `так` | **documented** | ЗУ 2229 ст.1,2; ПКМУ №234 |
| Presence_of_children_flag | bool | так/ні + кількість | `так, 2` | **legal** | ПКМУ №234 п.13 |
| Child_legal_guardian_data | string | ПІБ, статус, контакти | `опікун Іваненко Г.С., бабуся` | **documented** | ПКМУ №234 п.13 |
| Parents_are_abusers_flag | bool | так/ні | `так` | **documented** | ПКМУ №234 п.13 |
| Child_temporary_placement | enum | родичі\|знайомі\|патронатний вихователь\|заклад\|не влаштовано | `патронатний вихователь` | **documented** | ПКМУ №234 п.13 |
| Child_registered_difficult | bool | так/ні + дата | `так, 20.01.2026` | **documented** | ПКМУ №234 п.13 |
| Child_services_notification | string | дата, час, ПІБ+посада | `20.01.2026 14:30, інспектор ССД Петренко О.В.` | **legal** | ПКМУ №234 п.13 |
| Abuser_full_name | string | ПІБ | `Бондаренко Олександр Іванович` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Abuser_date_of_birth | date | DD.MM.YYYY | `05.02.1988` | **legal** | ПКМУ №234 п.13 |
| Abuser_sex | enum | жіноча\|чоловіча | `чоловіча` | **legal** | ПКМУ №234 п.13 |
| Abuser_citizenship | string | держава | `Україна` | **legal** | ЗУ 2229 ст.16 ч.3 |
| Abuser_address | string | повна адреса | `м. Харків, вул. Сумська, 1, кв. 2` | **legal** | ПКМУ №234 п.13 |
| Abuser_study/work | string | текст | `ТОВ "...", водій` | **legal** | ПКМУ №234 п.13 |
| Abuser_preventive_registration | string | дата взяття/зняття | `взято 21.01.2026` | **documented** | ПКМУ №234 п.13 |
| Incident_datetime | date | DD.MM.YYYY HH:MM | `19.01.2026 22:15` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Incident_place | string | адреса/опис | `за місцем проживання, м. Харків...` | **legal** | ПКМУ №234 п.13 |
| Form_of_violence | enum | фізичне\|психологічне\|сексуальне\|економічне\|за ознакою статі | `фізичне` | **legal** | ЗУ 2229 ст.1,16; ПКМУ №234 |
| Type_of_harm | string | текст/класифікатор | `тілесні ушкодження легкого ступеня` | **legal** | ЗУ 2229 ст.16 ч.3 |
| Primary/recurrent_flag | enum | первинне\|повторне | `повторне` | **documented** | ПКМУ №234 п.13 |
| Incident_description | string | вільний текст | `Завдав ударів, погрожував...` | **legal** | ЗУ 2229 ст.16 ч.3 |
| Police_notification | string | дата, час, ПІБ+посада | `19.01.2026 22:40, дільничний Сидоренко П.І.` | **legal** | ПКМУ №234 п.13 |
| Police_response_measures | string | перелік заходів | `виїзд, винесення ТЗП` | **legal** | ПКМУ №234 п.13 |
| Emergency_restraining_order (ТЗП) | object | дата, №, заходи, строк (до 10 діб) | `№045 від 19.01.2026, заборона наближення` | **legal** | ЗУ 2229 ст.25; ПКМУ №234 |
| Court_restraining_order | object | №+дата рішення, строк (1-6 міс), обмеження | `справа №640/.../2026 від 25.01.2026, 3 міс.` | **legal** | ЗУ 2229 ст.26; ПКМУ №234 |
| Abuser_intervention_program | string | дата, реквізити рішення | `направлено за рішенням суду 25.01.2026` | **documented** | ЗУ 2229 ст.28; ПКМУ №234 |
| ERDR_reference | string | № провадження, дата | `12026...0000123 від 20.01.2026` | **documented** | ПКМУ №234 п.13 |
| Administrative_offence_ruling | string | №, дата, стягнення (ст.173-2 КУпАП) | `постанова від 30.01.2026, штраф` | **documented** | ПКМУ №234 п.13 |
| Criminal_case_verdict | string | №, дата, захід/покарання, строк | `вирок від ..., обмеження волі 1 рік` | **documented** | ПКМУ №234 п.13 |
| Probation_program | string | дата, орган пробації | `орган пробації, 05.02.2026` | **documented** | ПКМУ №234 п.13 |
| Victim_needs | array | мед/псих/соц/правова допомога, притулок | `["психологічна допомога","притулок"]` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Safety_assessment_result | string | низький/середній/високий + опис | `високий рівень ризику` | **documented** | ПКМУ №234 п.13 |
| Engaged_authorities | array | суб'єкти реагування | `["Нацполіція","ССД","центр соц.служб"]` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Measures_taken | array | надані послуги | `["направлення до притулку","консультація психолога"]` | **legal** | ЗУ 2229 ст.16; ПКМУ №234 |
| Record_timestamp | date | DD.MM.YYYY HH:MM | `20.01.2026 09:00` | **documented** | ПКМУ №234 п.19 |
| Data_processing_consent | bool | так/ні + дата | `так, 20.01.2026` | **documented** | ЗУ 2297; ПКМУ №234 |

---

## 12. SKAID — «Електронний кабінет ювенального поліцейського» (ІПНП)

- **Власник:** Національна поліція України (ювенальна превенція; ЄІС МВС)
- **Правова основа:** Наказ МВС № 855 (z0055-23, розд. II п. 4); Наказ МВС № 1044 (z0686-18, розд. III); ЗУ «Про Національну поліцію»; ЗУ № 2229-VIII; ЗУ № 2657-VIII (булінг, ст. 173-4 КУпАП); ЗУ № 2297-VI; ЗУ № 5492-VI
- **access_level:** 2
- **Ключові ідентифікатори:** УНЗР; РНОКПП; серія/№ паспорта; № і дата обліково-профілактичної справи; ПІБ + дата народження

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Preventive_case_file_number | string | внутр. нумерація | `ОПС-2024-0457` | **documented** | Наказ №855 розд.II п.4 |
| Case_file_opening_date | date | DD.MM.YYYY | `14.03.2024` | **documented** | Наказ №855 розд.II п.4 |
| Registration_category | enum | засуджена до покарання без позбавл.волі\|звільнена з примус.заходами\|звільнена зі спец.установи\|вчинила дом.насильство\|2+ адмінвідп./рік\|2+ самовільне залишення/рік\|вчинила булінг | `вчинила булінг (цькування)` | **legal** | Наказ №1044 розд.III п.2 |
| Grounds_documents | array | вид, №, дата | `["постанова суду №754/123/24 від 10.03.2024"]` | **documented** | Наказ №855 розд.II п.4 |
| Child_full_name | string | ПІБ | `Коваленко Іван Петрович` | **legal** | Наказ №855; №1044 розд.III |
| Child_date_of_birth | date | DD.MM.YYYY | `08.09.2009` | **legal** | Наказ №855; №1044 |
| Sex | enum | чоловіча\|жіноча | `чоловіча` | **documented** | Наказ №855 розд.II п.4 |
| Citizenship | string | держава/без громадянства | `Україна` | **documented** | Наказ №855 розд.II п.4 |
| Place_of_birth | string | нас.пункт, р-н, обл., країна | `м. Полтава, Полтавська обл., Україна` | **documented** | Наказ №855 розд.II п.4 |
| Place_of_residence | string | повна адреса | `м. Полтава, вул. Соборності, 12, кв. 5` | **documented** | Наказ №855 розд.II п.4 |
| Place_of_study/work | string | назва закладу/місця | `Полтавський ліцей №9, 8 клас` | **documented** | Наказ №855 розд.II п.4 |
| Identity_document | string | тип, назва, серія, №, дата | `паспорт громадянина України №001234567, 12.09.2023` | **documented** | Наказ №855 розд.II п.4 |
| UNZR | string | РРРРММДД-ХХХХХ | `20090908-01234` | **documented** | Наказ №855 розд.II п.4 |
| RNOKPP | string | 10 цифр (ДРФО) | `3456789012` | **documented** | Наказ №855 розд.II п.4 |
| Contact_phone | string | +380XXXXXXXXX | `+380501234567` | **documented** | Наказ №855 розд.II п.4 |
| Administrative_liability | array | стаття КУпАП, дата, рішення | `["ст.173-4 КУпАП, 02.02.2024"]` | **documented** | Наказ №855 розд.II п.4 |
| Criminal_liability | array | стаття КК, дата, рішення | `["ст.185 КК, ухвала від 10.03.2024"]` | **documented** | Наказ №855 розд.II п.4 |
| Prevention_measures | array | заходи з датами | `["профілактична бесіда 20.03.2024"]` | **documented** | Наказ №855 розд.II п.4 |
| Causes_conditions | string | вільний текст | `відсутність батьківського контролю` | **documented** | Наказ №855 розд.II п.4 |
| Removal_from_registration | string | дата + підстава | `09.09.2027, досягнення повноліття` | **documented** | Наказ №855 розд.II п.4 |
| Parents_guardians_block | array | повний блок реквізитів на особу (ПІБ, дата, стать, громад., місце народж./прож., документ, УНЗР, РНОКПП, тел.) | `[{ПІБ:'Коваленко Петро Іванович',РНОКПП:'2789012345'}]` | **documented** | Наказ №855 розд.II п.4 |
| Child_domestic_violence_perpetrator | bool | так/ні + форма насильства | `так — психологічне` | **legal** | Наказ №1044 розд.III п.2 пп.4 |
| Child_bullying_perpetrator | bool | так/ні + ст.173-4 КУпАП | `так — фізичне цькування однокласника` | **legal** | Наказ №1044 розд.III п.2 пп.7 |
| Response_when_child_victim | array | звернення/заходи (дата, тип, орган) | `["повідомлення про дом.насильство 11.02.2024"]` | **approximated** | немає публічної схеми |
| Linkage_to_Person_subsystem | string | внутр. ID зв'язку | `PERSON-ID 884512` | **approximated** | схема інтеграції непублічна |

---

## 13. CBDI — Централізований банк даних з проблем інвалідності (ЦБІ)

- **Власник:** Мінсоцполітики; адмін — ДП «ІОЦ Мінсоцполітики». Джерела: органи соцзахисту, ПФУ, ЕС МСЕ (МСЕК), ЗОЗ, МВС, ДМС, ДРАЦС, ЄДДР
- **Правова основа:** ПКМУ № 121 (Положення про ЦБІ, ред. 2025); ЗУ «Про основи соц. захищеності осіб з інвалідністю»; ЗУ «Про реабілітацію осіб з інвалідністю»; ПКМУ № 757 (ІПР); Наказ МОЗ № 623 (форми ІПР, оновл. 12.2024); ЗУ № 2297-VI
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП; УНЗР; серія/№ паспорта; серія/№ свідоцтва про народження; № і дата акта ЕС МСЕ/висновку; № і дата ІПР

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Last_name | string | UA Cyrillic | `Коваленко` | **legal** | ПКМУ №121 |
| First_name | string | text | `Софія` | **legal** | ПКМУ №121 |
| Patronymic | string | nullable | `Андріївна` | **legal** | ПКМУ №121 |
| Date_of_birth | date | DD.MM.YYYY | `14.03.2016` | **legal** | ПКМУ №121 |
| Sex | enum | чоловіча\|жіноча | `жіноча` | **legal** | ПКМУ №121 |
| Registered_residence | string | повна адреса | `Київська обл., м. Бровари, вул. Шевченка, 12, кв. 5` | **legal** | ПКМУ №121 |
| Phone_number | string | +380XXXXXXXXX | `+380501234567` | **documented** | форма е-кабінету |
| Email | string | email | `mother@example.com` | **documented** | форма е-кабінету |
| Taxpayer_ID | string | 10 цифр; nullable | `3456789012` | **legal** | ПКМУ №121 |
| UNZR | string | RRRRMMDD-NNNNN | `20160314-01234` | **approximated** | ЄДДР; тех.схема непублічна |
| Passport_details | string | серія+№/ID-картка, орган, дата, строк | `ID-картка 001234567, 8080, 20.03.2030` | **legal** | ПКМУ №121 |
| Birth_certificate_details | string | серія+№, дата, орган РАЦС (діти <14) | `I-БК №123456, 25.03.2016, Броварський ВДРАЦС` | **legal** | ПКМУ №121 |
| Citizenship | string | text | `Україна` | **approximated** | відновлено |
| Child_with_disability_flag | bool | true/false | `true` | **legal** | ПКМУ №121 |
| Category_of_child_disability | enum | А\|Б\|В\|Г | `А` | **documented** | Наказ МОЗ №623 |
| Disability_group | enum | I(А/Б)\|II\|III (не для дитини) | `II` | **legal** | ПКМУ №121 |
| Cause_of_disability | enum | з дитинства\|загальне захворювання\|вроджена вада | `інвалідність з дитинства` | **legal** | ПКМУ №121 |
| Diagnosis_ICD10 | string | код МКХ-10 | `G80.1` | **legal** | ПКМУ №121 |
| Date_disability_established | date | DD.MM.YYYY | `10.04.2020` | **legal** | ПКМУ №121 |
| Disability_term/next_assessment | date | DD.MM.YYYY або «безстроково» | `01.04.2027` | **legal** | ПКМУ №121 |
| MSEK_act_details | string | №, дата, орган | `№0456 від 10.04.2020, КНП «Дитяча лікарня»` | **legal** | ПКМУ №121; №757 |
| Lost_capacity_degree | number | 0-100 (для дітей зазвичай 0) | `0` | **legal** | ПКМУ №121 |
| Legal_representative | string | ПІБ, РНОКПП, тип, документ | `мати: Коваленко О.І., РНОКПП 2345678901` | **legal** | ПКМУ №121 |
| Education_level | string | text/enum | `дошкільна освіта` | **legal** | ПКМУ №121 |
| Occupation | string | text | `—` | **legal** | ПКМУ №121 |
| IRP_measures | array | медична/психолого-педагог./фізична/проф./соц. реабілітація | `[медична, психолого-педагогічна]` | **legal** | ПКМУ №757; Наказ МОЗ №623 |
| IRP_details | string | №, дата, заклад | `ІПР №789 від 12.04.2020` | **legal** | ПКМУ №757 |
| Assistive_devices_need | array | ТЗР з кодами | `[крісло колісне, ортопедичне взуття]` | **legal** | ПКМУ №121 |
| Assistive_devices_provision | array | дата, постачальник, модель, вартість, гарантія | `[крісло колісне, ТОВ..., 12.05.2021]` | **legal** | ПКМУ №121 |
| Repair_services | array | дата, виконавець, вид | `[ремонт крісла, 03.2023]` | **documented** | опис системи ЦБІ |
| Rehabilitation_services | array | вид, заклад, період | `[реабілітація, 2022]` | **legal** | ПКМУ №121 |
| Sanatorium_treatment | array | путівка №, санаторій, період | `[санаторій «Хаджибей», 06.2023]` | **legal** | ПКМУ №121 |
| Benefit_documents | array | тип, №, дата | `посвідчення дитини з інвалідністю №...` | **legal** | ПКМУ №121 |
| Death_record | object | дата смерті з ДРАЦС | `—` | **legal** | ПКМУ №121 |
| Registration_date_CBI | date | DD.MM.YYYY | `11.04.2020` | **approximated** | відновлено |
| Servicing_authority | string | назва/код УСЗН | `УСЗН Броварської міської ради` | **documented** | опис ролей ЦБІ |

---

## 14. DRRP — Державний реєстр речових прав на нерухоме майно (ДРРП)

- **Власник:** Мін'юст (держатель); адмін — ДП «Національні інформаційні системи»
- **Правова основа:** ЗУ № 1952-IV (ст. 4, 9, 12, 25, 26, 27, 28, 32); ПКМУ № 1141 (Порядок, п. 29, 30, 32); ПКМУ № 1127; СК ст. 177; ЗУ № 2623-IV (ст. 12)
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП суб'єкта; УНЗР; реєстр.№ об'єкта; № запису про право; кадастровий №; індексний № витягу

> **КРИТИЧНО для дитячого контексту:** поля `ownership_share` (частка дитини) та `child_residence_use_flag` ключові для виявлення майнових прав дитини. СК ст. 177 і ЗУ № 2623-IV ст. 12 — захист.

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Object_registration_number | string | числовий ID (авто) | `2715634680000` | **legal** | ПКМУ №1141 п.29; ЗУ 1952 ст.12 |
| Land_cadastral_number | string | NNNNNNNNNN:NN:NNN:NNNN | `8000000000:85:055:0123` | **legal** | ПКМУ №1141 п.29 |
| Object_type | enum | квартира\|житловий будинок\|гаражний бокс\|земельна ділянка\|нежитлове приміщення | `Квартира` | **legal** | ПКМУ №1141 п.29 |
| Object_address | string | повна поштова адреса | `м. Київ, вул. Хрещатик, буд. 1, кв. 5` | **legal** | ПКМУ №1141 п.29 |
| Total_area | number | кв. м | `56.40` | **legal** | ПКМУ №1141 п.29 |
| Living_area | number | кв. м | `32.10` | **legal** | ПКМУ №1141 п.29 |
| Subject_full_name | string | ПІБ українською | `Іваненко Софія Петрівна` | **legal** | ПКМУ №1141 п.30; ЗУ 1952 ст.9 |
| Subject_date_of_birth | date | DD.MM.YYYY | `14.03.2015` | **approximated** | п.30 прямо не названо; у витязі для ідентифікації |
| Subject_RNOKPP | string | 10 цифр | `3856701234` | **legal** | ПКМУ №1141 п.30; для дитини може бути відсутній |
| Subject_UNZR | string | NNNNNNNN-NNNNN | `20150314-01234` | **legal** | ПКМУ №1141 п.30 |
| Identity_document_details | string | серія/№; для дитини — свідоцтво про народження | `Свідоцтво про народження I-БК №123456 від 20.03.2015` | **legal** | ПКМУ №1141 п.30 |
| Right_type | enum | право власності\|право користування\|іпотека\|сервітут | `Право власності` | **legal** | ПКМУ №1141 п.30; ЗУ 1952 ст.4 |
| Common_ownership_type | enum | спільна часткова\|спільна сумісна | `Спільна часткова власність` | **legal** | ПКМУ №1141 п.30 |
| Ownership_share_size | string | дріб (1/3, 1/2) | `1/4` | **legal** | ПКМУ №1141 п.30 (КЛЮЧОВЕ — частка дитини) |
| Registration_basis | string | назва, серія, №, дата документа | `Свідоцтво про право на спадщину №1234 від 10.01.2024` | **legal** | ПКМУ №1141 п.30; ЗУ 1952 ст.27 |
| Right_record_number | string | числовий (авто) | `54321678` | **legal** | ПКМУ №1141 п.30 |
| Registration_datetime | date | DD.MM.YYYY HH:MM:SS | `10.01.2024 11:23:45` | **legal** | ПКМУ №1141; ЗУ 1952 ст.25 |
| State_registrar/notary | string | ПІБ, посада, орган | `Держреєстратор Коваленко О.М.` | **legal** | ПКМУ №1141 |
| Encumbrance_type | enum | заборона відчуження\|арешт\|іпотека\|податкова застава | `Заборона на нерухоме майно` | **legal** | ПКМУ №1141 п.32 |
| Encumbrance_subject | string | опис об'єкта та умов | `Заборона відчуження квартири` | **legal** | ПКМУ №1141 п.32 |
| Encumbrancer_details | string | ПІБ/найменування, код | `АТ "Банк", ЄДРПОУ 12345678` | **legal** | ПКМУ №1141 п.32 |
| Object_price | number | грн | `1850000.00` | **legal** | ПКМУ №1141 п.30 |
| Object_id_EDESB | string | буквено-цифровий | `UA01-2023-1234567` | **legal** | ПКМУ №1141 п.29 (після 2020) |
| Extract_index_number | string | числовий | `376541234` | **documented** | офіційний витяг ДРРП (Дія) |
| Child_residence_use_flag | bool | так/ні — НЕ власне поле ДРРП | `так (за даними реєстру тер.громади)` | **approximated** | реєстрація — у реєстрі тер.громади (ПКМУ №265); захист СК ст.177, ЗУ 2623 ст.12 |

---

## 15. PFU — Реєстр застрахованих осіб (Держреєстр загальнообов'язкового соцстрахування)

- **Власник:** Пенсійний фонд України (ПФУ)
- **Правова основа:** ЗУ № 2464-VI (ст. 16); ЗУ № 1058-IV (ст. 11-14, 20-24); Постанова правління ПФУ № 10-1 (№ 785/25562, ред. № 8-1/№ 476/32028); Наказ Мінфіну № 4 (довідник кодів категорій); ЗУ № 5492-VI
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП (осн. ключ); унік.№ електронної облікової картки; № посвідчення застрахованої особи; УНЗР; серія/№ свідоцтва про соцстрахування (історично)

> **Контекст дитини:** прямих полів дитини немає; дитина проявляється опосередковано через код категорії застрахованої особи батьків та похідну ознаку працевлаштування.

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| Unique_account_card_number | string | внутр. ID ПФУ | `00000123456789` | **documented** | Положення про РЗО |
| Taxpayer_number (РНОКПП) | string | 10 цифр | `2345678901` | **legal** | ЗУ 2464 ст.16; ЗУ 1058 ст.20 |
| UNZR | string | РРРРММДД-ХХХХХ | `19850312-01234` | **documented** | Положення про РЗО; ЗУ 5492 |
| Identity_document | string | серія+№/ID-картка/№ паспорта | `ID-картка №001234567` | **documented** | Положення про РЗО |
| Insured_certificate_number | string | серія(2 літ.)+6 цифр (історично) | `АБ123456` | **legal** | ЗУ 1058 ст.20 |
| Full_name_archival | string | кирилиця | `Іваненко Іван Іванович` | **documented** | Положення про РЗО |
| Full_name_current | string | кирилиця | `Петренко Іван Іванович` | **documented** | Положення про РЗО |
| Date_of_birth | date | ДД.ММ.РРРР | `12.03.1985` | **legal** | ЗУ 1058 ст.20 |
| Sex | enum | Ч\|Ж | `Ч` | **documented** | Положення про РЗО |
| Citizenship | string | код/назва країни | `Україна` | **documented** | Положення про РЗО |
| Place_of_birth | string | текст | `м. Київ` | **approximated** | відновлено логічно |
| Residential_address | string | текст/структуровано | `м. Київ, вул. Хрещатик, 1, кв. 1` | **approximated** | формат у схемі не наведено |
| Phone_number | string | +380XXXXXXXXX (за згодою) | `+380501234567` | **documented** | Положення про РЗО |
| Death_mark | date | ДД.ММ.РРРР | `01.02.2024` | **documented** | Положення про РЗО |
| Insured_category_code | enum | числовий код з довідника | `1 (найманий працівник), 6 (ФОП загальна)` | **legal** | ЗУ 1058 ст.11-12; Наказ Мінфіну №4 |
| Employment_status_indicator | enum | похідна: працевлаштований/непрацевлаштований | `працевлаштований` | **approximated** | похідна над періодами+кодом категорії |
| Reporting_year | number | РРРР | `2024` | **documented** | Положення про РЗО |
| Insurer_identifier | string | ЄДРПОУ 8/РНОКПП 10 + назва | `12345678 ТОВ "Приклад"` | **legal** | ЗУ 2464 ст.16 |
| Employment_period | array | дата початку — кінця (помісячно) | `01.01.2024–31.12.2024` | **documented** | Положення про РЗО |
| Calendar_days_per_month | number | 0-31 | `30` | **documented** | Положення про РЗО |
| Insurance_record_periods | array | інтервали з місяцями стажу | `з 01.2004, 20 років 3 міс` | **legal** | ЗУ 1058 ст.24 |
| Wage/income | number | грн, 2 десяткові | `25000.00` | **legal** | ЗУ 2464 ст.16 |
| Contribution_amount (ЄСВ) | number | грн, 2 десяткові | `5500.00` | **legal** | ЗУ 2464 ст.16 |
| Days/hours_worked | number | ціле/десяткове | `176` | **documented** | Положення про РЗО |
| Occupation/position | string | за ДК 003 | `бухгалтер` | **documented** | Положення про РЗО |
| Special_working_conditions | string | код пільги/спецстаж | `Список №1, поз. 1010100а` | **legal** | ЗУ 1058 ст.13-14 |
| Voluntary_contributions | number | грн | `1200.00` | **documented** | Положення про РЗО |
| Insurance_payment | array | вид+дата+сума; вид страх.випадку | `пенсія за віком, з 01.01.2024, 7500.00` | **documented** | Положення про РЗО |

---

## 16. EISSS — ЄІССС (підсистема соцдопомоги сім'ям з дітьми/малозабезпеченим), запис про дитину

- **Власник:** Мінсоцполітики; тех.адмін — ДП «ІОЦ Мінсоцполітики»
- **Правова основа:** ПКМУ № 404 (Положення про ЄІССС, п. 31, 33); ПКМУ № 1278; ЗУ № 2811-XII; ЗУ № 1768-III; ПКМУ № 250 (Декларація про доходи, розд. «Дані про осіб у складі сім'ї»); ПКМУ № 1751; Наказ Мінсоцполітики № 3 (форма заяви, № 145/39201); ЗУ № 2297-VI; ЗУ № 5492-VI
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП дитини/заявника; УНЗР; серія/№ свідоцтва про народження; № особової справи; № актового запису (через ДРАЦС)

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| child_full_name | string | ПІБ кирилицею; по батькові за наявності | `Коваленко Софія Андріївна` | **legal** | ПКМУ №250, Декларація розд.3 |
| family_relationship | enum | дитина/син/дочка\|опікуваний\|пасинок/падчерка\|утриманець | `дочка` | **legal** | ПКМУ №250, розд.3 |
| birth_certificate_series_number | string | серія(літери)+№ | `I-АП №123456` | **legal** | ПКМУ №250, розд.3 |
| rnokpp_child | string | 10 цифр (або серія/№ паспорта з відміткою) | `3456789012` | **legal** | ПКМУ №250; Наказ №3 |
| birth_date_child | date | ДД.ММ.РРРР | `05.03.2019` | **documented** | Наказ №3; інтеграція ДРАЦС/ЄДДР |
| unzr | string | РРРРММДД-XXXXX; за наявності | `20190305-01234` | **documented** | Наказ №3 |
| sex | enum | чоловіча\|жіноча | `жіноча` | **approximated** | похідне з ДРАЦС; не виокремлено як графа |
| birth_place | string | нас.пункт, р-н, обл., країна | `м. Львів, Україна` | **approximated** | похідне з ДРАЦС; відновлено |
| registered_declared_residence | string | повна адреса + ознака реєстр./деклар. | `м. Київ, вул. Хрещатик, 1, кв. 5 (задеклароване)` | **legal** | Наказ №3 |
| child_legal_status | enum | у сім'ї\|усиновлена\|під опікою/піклуванням\|сирота\|ПБП\|патронат\|прийомна сім'я\|ДБСТ | `дитина, позбавлена батьківського піклування` | **legal** | Наказ №3; ЗУ 2811 |
| child_with_disability_flag | bool | так/ні + група/категорія | `так` | **legal** | Наказ №3; висновок МСЕК/ЛКК (медтаємниця) |
| single_mother_flag | bool | так/ні + блок «Інформація одинокої матері» | `так` | **legal** | Наказ №3 |
| guardianship_custody | string | факт опіки/піклування, реквізити рішення | `опіка, рішення ОМС №45 від 12.02.2022` | **legal** | Наказ №3 |
| alimony_received | number | сума, грн за період | `3200.00` | **legal** | ПКМУ №250 розд.VIII; Наказ №3 |
| income_data | array | види/суми доходів (розд. II Декларації) | `стипендія 2000 грн/міс` | **legal** | ПКМУ №250 розд.II; перевірка ДРФО+РЗО |
| large_family_flag | bool | так/ні (3+ дітей) | `так` | **legal** | Наказ №3 п.13; ЗУ 2811 |
| property_status | array | житло, ТЗ(<15р.), депозити >100 тис., великі витрати | `квартира 45 кв.м; авто 2015 р.` | **legal** | ПКМУ №250 розд.III–VII |
| application_type | enum | первинне\|повторне | `первинне` | **documented** | Наказ №3 |
| case_file_number | string | № особової справи в ЄІССС | `№778899` | **documented** | Наказ №3 |
| application_registration_date | date | ДД.ММ.РРРР | `14.02.2026` | **documented** | Наказ №3 |
| benefit_type | enum | 1 з 14 видів (при народженні\|одиноким матерям\|під опікою\|малозабезпеченим...) | `Допомога при народженні дитини` | **legal** | Наказ №3 |
| payout_account_iban | string | IBAN (UA+27) або найменування виплатника | `UA213223130000026007233566001` | **legal** | Наказ №3 |
| pd_consent | bool | так/ні + згода щодо зазначених осіб | `так` | **legal** | Наказ №3; ЗУ 2297 |

---

## 17. HOTLINE — Гарячі лінії 116 111 (Ла Страда) та 1545 (УКЦ), журнали звернень

- **Власник:** (1) ГО «Ла Страда-Україна» (116 111, анонімна, недержавна); (2) ДУ «Урядовий контактний центр» при Секретаріаті КМУ (1545). Дані про дитину передаються до ССД, можуть надходити Омбудсмену з прав дитини
- **Правова основа:** ЗУ № 393/96-ВР (реквізити звернення); ПКМУ № 898 (реєстраційна картка 1545); ПКМУ № 585 (журнал обліку повідомлень про дитину); ПКМУ № 866; ЗУ «Про охорону дитинства»; ЗУ № 2229-VIII
- **access_level:** 2
- **Ключові ідентифікатори:** РНОКПП дитини (часто відсутній — анонімні дзвінки); РНОКПП заявника (1545); індивід.№ звернення; телефон абонента; ПІБ дитини + дата народження (квазі-ідентифікатор)

> **Особливість для генератора:** дві гілки — анонімна (116 111: багато полів порожні/відсутні) та ідентифікована (1545). Анонімність радикально впливає на повноту запису.

| Поле | Тип | Формат | Приклад | Fidelity | Джерело |
|---|---|---|---|---|---|
| appeal_id | string | маска реєстру УКЦ 1545-РРРР-XXXXXXX; для 116111 — внутр.ID | `1545-2026-0481923` | **legal** | ПКМУ №898 (для 1545); 116111 — approximated |
| received_at | date | ISO 8601 / дд.мм.рррр гг:хв | `2026-06-16T14:32:00` | **legal** | ПКМУ №585 п.6; №898 |
| channel_source | enum | телефон\|онлайн-чат\|Telegram\|Instagram\|Facebook\|email\|вебформа | `телефон` | **documented** | опис каналів 116111/1545 |
| caller_type | enum | дитина\|один з батьків\|родич\|сусід/третя особа\|педагог\|соцпрацівник\|інше | `сусід` | **approximated** | статзвіти Ла Стради; не в законі |
| reporter_full_name | string | ПІБ (може бути неповним/відсутнім) | `Іванова Олена Петрівна` | **legal** | ПКМУ №866; ст.5 ЗУ 393; 116111 — approximated |
| contact_phone | string | +380XXXXXXXXX | `+380671234567` | **legal** | ПКМУ №898 |
| contact_email | string | email/опис засобу | `olena.i@example.com` | **legal** | ПКМУ №898; ст.5 ЗУ 393 |
| reporter_address | string | обл., р-н, НП, вул., буд., кв. | `м. Київ, вул. Хрещатик, 1, кв. 5` | **legal** | ПКМУ №898; ст.5 ЗУ 393 (без адреси — анонімне) |
| child_full_name | string | ПІБ (часто лише ім'я/відсутнє) | `Ковальчук Андрій Сергійович` | **legal** | ПКМУ №585 п.6; №866 |
| child_birthdate_age | date | дд.мм.рррр або повних років | `12 років` | **legal** | ПКМУ №585 п.6; №866 |
| child_sex | enum | чоловіча\|жіноча | `чоловіча` | **documented** | форма повідомлення про дитину у СЖО |
| child_rnokpp | string | 10 цифр (часто відсутній) | `3899012345` | **approximated** | не вимагається на 116111 |
| child_location | string | адреса/опис місцезнаходження | `м. Львів, вул. Зелена, 24, кв. 7` | **legal** | ПКМУ №585 п.6; №866 |
| parents_info | string | ПІБ батьків/опікунів, контакти, статус | `мати — Ковальчук О.М.; батько невідомий` | **legal** | ПКМУ №585 п.6; №866 |
| appeal_category | enum | консультація\|скарга\|повідомлення про насильство\|запит допомоги\|інформування | `повідомлення про насильство` | **approximated** | реконструйовано (статзвіти/класифікатори) |
| topic | enum | домашнє насильство\|булінг\|безпека в інтернеті\|психологічна криза/суїцид\|торгівля людьми\|права дитини\|сімейні стосунки\|інше | `безпека в інтернеті` | **approximated** | публічні звіти Ла Стради; класифікатор непублічний |
| violence_type | enum | фізичне\|психологічне\|сексуальне\|економічне\|нехтування потребами | `психологічне` | **legal** | ЗУ 2229; ПКМУ №585 |
| circumstances | string | вільний текст обставин | `батько застосовує фіз.покарання, дитина боїться` | **legal** | ПКМУ №866; №585 |
| safety_risk_flag | bool | загроза життю/здоров'ю (так/ні) + рівень | `true` | **legal** | ПКМУ №585 п.6 (акт оцінки безпеки) |
| summary | string | вільний текст | `Сусідка повідомляє про крики та сліди побоїв у дитини 8 років` | **legal** | ПКМУ №898; №585 п.6 |
| operator_name | string | ПІБ оператора/психолога | `Шевченко М.І.` | **legal** | ПКМУ №585 п.6 |
| action_taken | enum | консультація\|передано в ССД\|передано в Нацполіцію(102)\|передано в соцслужбу\|на контроль\|без дій | `передано в ССД та Нацполіцію` | **documented** | ПКМУ №898; №585 |
| response_method | enum | телефон\|email\|усно\|письмово | `телефон` | **legal** | ПКМУ №898 |
| status | enum | зареєстровано\|в роботі\|направлено за компетенцією\|вирішено\|закрито | `направлено за компетенцією` | **documented** | Положення про Нац.систему опрацювання звернень |
| is_anonymous | bool | так/ні | `true` | **documented** | опис 116111 (анонімна); 1545 анонімні не розглядаються |

---

## ЗВЕДЕНІ ПРАВИЛА ДЛЯ ГЕНЕРАТОРА СИНТЕТИЧНИХ ДАНИХ

**Рівні доступу (access_level):** 1 = найвищий захист (медтаємниця/досудове розслідування — EHEALTH, ERDR); 2 = обмежений доступ (більшість); 3 = відкритий з обов'язковим знеособленням (EDRSR).

**Крос-реєстрова консистентність (одна синтетична дитина → багато реєстрів):**
- Згенерувати канонічний «золотий запис» особи: ПІБ, дата народження, стать, місце народження.
- Похідні коди (УНЗР, РНОКПП) обчислити детерміновано від дати народження + статі; прокинути в усі реєстри без змін.
- Свідоцтво про народження (серія+№) генерувати один раз у DRACS і повторно використовувати у EDDR, EHEALTH, EDEBO, AIKOM, VPO, DITY, CBDI, DRRP, EISSS.
- Формати дат: DD.MM.YYYY (ДРАЦС, ЄДДР, ВПО, ЄРДР, ЄДРСР, DV, ЦБІ, PFU, EISSS) ПРОТИ YYYY-MM-DD (тільки EHEALTH, ISO 8601).
- Регістр: CHILDWAR використовує ВЕЛИКІ ЛІТЕРИ для ПІБ і місць; EHEALTH/EDEBO використовують латинські enum-значення.

**Маркування fidelity у вихідних даних:** для кожного згенерованого поля додати метатег `fidelity`. Поля `approximated` мають супроводжуватися ознакою `reconstructed: true`, щоб користувач генератора не сприймав їх як підтверджену схему. Особливо це стосується ВСІХ дитячо-потерпілих полів ЄРДР, депортаційних/біометричних полів CHILDWAR, та внутрішніх ID/timestamp/login полів AIKOM, DITY, SKAID.

**Знеособлення (тільки EDRSR):** реалізувати dual-render — повний (службовий) запис із фактичними ПІБ/датами та публічний запис із заміною на `ОСОБА_N`/`ІНФОРМАЦІЯ_N`; РНОКПП, УНЗР, адреси, документи у публічному — завжди `знеособлено`.

**Умовна порожнеча:** анонімні записи HOTLINE (116 111, is_anonymous=true) → reporter_full_name/address/child_rnokpp порожні; дитячі РНОКПП у DRACS/VPO/ERDR/HOTLINE — часто null (немовлята); батько у DRACS — може бути відсутній або записаний за ч.1 ст.135 СК.