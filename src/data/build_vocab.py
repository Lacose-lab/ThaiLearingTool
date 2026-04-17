import json, re

# ── helpers ──────────────────────────────────────────────────────────────────
def has_thai(s):
    return bool(re.search(r'[\u0E00-\u0E7F]', s or ''))

def clean(s):
    return (s or '').strip()

# ── SECTION HEADERS in Wordrecap (detect by col-A value) ─────────────────────
SECTION_MAP = {
    'คำกริยา': 'verbs',
    'คำนาม':   'nouns',
    'สรรพนาม': 'pronouns',
    'ลักษณะนาม': 'classifiers',
    'คำบุพบท': 'prepositions',
    'วัน เวลา': 'time',
    'สี':       'colors',
    'ประโยคมีประโยชน์': 'phrases',
    'Filler words': 'fillers',
    'ส่วนต่างๆของร่างกาย': 'body',
    'อาหาร':   'food',
    'ระบบเวลาไทย': 'time',
    'ก็เลย':   'fillers',   # first filler entry also marks section
}

# ── WORDRECAP ─────────────────────────────────────────────────────────────────
wordrecap_rows = [["Multilingual Master APP"],["ภาษาไทย","Eng translate","Deutsch","Explaination"],["คำถาม","Question","Frage"],["เมื่อไหร่","When","Wann","commom book/speaking"],["เท่าไหร่","How many-much","Wie viele?","","How many-much"],["กี่","How many-much","Wie viele?","No need classier/ no spacific"],["กี่โมง","What time","Wie viel Uhr","~ How many + o'clock"],["อะไร","What","Was"],["ที่ไหน","Where","Wo","place + Which"],["ไหน","Which","Welche","classifier + Which"],["ใคร","Who","WHO"],["ยังไง","How","Wie","Oral talking / Casual"],["ไหม","?","?"],["ทำไม","Why","Warum"],["เพราะอะไร","Why","Warum","softer (in some situation)"],["(แล้ว)รึยัง","Yet?","Noch?","already or Not yet"],["เหรอ","really?","Wirklich?","to make more polite say \n\"จริงเหรอ\""],["อื่นๆ","ETC.","USW."," "],["ก็","also","Auch","pronouce as = ก้อ"],["บ้าง","Some","Manche","more than 1 option"],["ถ้า","if","Wenn"],["ถึง","to","Zu","1 ถึง 10"],["เพราะ","because","Weil","เกาะ - island"],["สำหรับ","for","für","for something"],["ให้","for, to give","für, geben","someone"],["เพื่อ","for, in oder to","für, um zu","for something important, purpose"],["แต่","but","Aber"],["กว่า","more // than","mehr // als","ex. ดี (good) ดีกว่า (better) ดีที่สุด (best)"],["ที่สุด","The most","Die meisten"],["แค่","only, just","nur, nur"],["เอง","self","selbst"],["ตัวเอง","oneself","sich"],["เคย","ever","immer","Have ever ... (talk about exp.)"],["เคยเป็น","used to be","früher"],["ไม่เคย","never","niemals"],["ที่","at","bei"],["ของ","of","von"],["และ","and","Und"],["แล้วก็","then, and, so.","dann, und so."],["หรือ","or","oder"],["จนถึง","until","bis"],["กับ","with","mit","sometimes ( and) if talk only 2 things"],["จะ","will/shall","will/shall"],["น่าจะ","Maybe","Vielleicht"],["อาจจะ","Maybe","Vielleicht"],["เกี่ยวกับ","about","um"],["ประมาณ","about (aproximately)","ungefähr","ประมาณ (number)"],["โดน","[to] be in trouble ; get in trouble\r\n(auxiliary that indicates the following verb is in the passive voice)","[to] in Schwierigkeiten sein; in Schwierigkeiten geraten\n(Hilfsverb, das anzeigt, dass das folgende Verb im Passiv steht)","Ex. got hit, got scam, burn"],["แห้ง","dry","trocken"],["เปียก","wet","nass"],["เหนือ","North","Norden"],["ใต้","South","Süden"],["ตะวันออก","East","Ost","Sun + exit"],["ตะวันตก","West","Westen","Sun + fall"],["ง่วง","Sleepy","Schläfrig"],["หิว","hungry","hungrig"],["หิวน้ำ","thirsty","durstig"],["เยอะ","a lot, many","viele"],["น้อย","less, few","weniger, wenige"],["น้อยกว่า","less than","weniger als"],["มาก","very","sehr"],["มากกว่า","more than","mehr als"],["เกินไป","too much;excessively","zu viel; übermäßig"],["แพง","Expensive","Teuer"],["ถูก","Cheap","Billig"],["ใหม่","New","Neu"],["เก่า","old","alt"],["ผัด","stir fry","pfannenrühren","less oil"],["ทอด","fry","braten","lot of oil"],["เครียด","Stressful","Stressig"],["นาน","long","lang","long for Time only"],["ที่นี่","here","Hier"],["แล้วแต่","depend","abhängen","// up to you"],["ดีขึ้น","get better","Besserung"],["ร้อน","hot","heiß"],["เย็น","cold","kalt"],["หนาว","cold","kalt","people feeling"],["เล็ก","small","klein"],["ใหญ่","big","groß"],["ทั้งหมด","total, all","insgesamt"],["ทั้งวัน","all day","den ganzen Tag"],["แถว","around an area","rund um ein Gebiet","can say twice"],["เหนื่อย","tired","müde"],["รุ่น","model, generation","Modell, Generation"],["อันตราย","dangerous","gefährlich"],["เผ็ด","Scpicy","Scharf","🌶️"],["หวาน","sweet","süß","🍧"],["เปรี้ยว","sour","sauer","🍋‍🟩"],["ขม","bitter","bitter","😣"],["เค็ม","salty","salzig","🧂"],["ทุก+","every~","jeden~","ทุกวัน, ทุกคน"],["บาง+","Some~","Einige~","บางวัน, บางคน"],["เจ็บ","painful","schmerzhaft"],["อีก","more, other","mehr, andere"],["เร็ว","fast","schnell","~Early"],["ช้า","slow","langsam","~Late"],["นี้","This","Das"],["นั้น","That","Das"],["ด้วยกัน","together","zusammen"],["ขี้เกียจ","Lazy","Faul","A. ขก."],["ตลก","funny","lustig"],["เช่น","for example. such as","zum Beispiel."],["เหมือนกัน","also;as well;too","auch; ebenso; auch"],["เหมือนเดิม","the same as before","das Gleiche wie zuvor"],["เสีย","spoil, bad","verderben, schlecht","ท้อง + เสีย = stomach + bad = diarrhea"],["อื่น","others","andere"],["เกือบ","almost","fast"],["พอใจ","satisfied","befriedigt"],["พอ","[to be] enough;sufficient","ausreichend sein; ausreichend"],["แย่","bad","schlecht"],["ปกติ","usually, normally, commonly, [to be] normal","gewöhnlich, normalerweise, üblicherweise, normal"],["เผลอ","[to be] careless","[sich] unvorsichtig verhalten"],["ต่อ","per","pro"],["พร้อม","at the same time/ [to be] ready","gleichzeitig/ bereit sein"],["งง","[to be] confused","verwirrt sein"],["หนัก","[to be] heavy;hard","schwer sein; hart"],["สนุก","[to be] fun;enjoyable","Spaß machen; angenehm sein"],["สว่าง","[to] be bright","hell sein"],["แรก","the first","der erste"],["สุดท้าย","the last","der letzte"],["เศร้า","[to be] sad","traurig sein"],["ดีใจ","[to be] happy","glücklich sein"],["กลัว","[to] be scared ; fear","Angst haben; Furcht"],["คำกริยา","Verb","Verb"],["เป็น","(to) be","(zu sein","Identity, roles, or characteristics\n(nationallity, position, having disese/ilness,relationship)"],["","","zu sein","**more flexible in real life speaking"],["","","zu sein","**Mostly use for people "],["อยู่","(to) be located","(zu) befinden","Refers to location or existence"],["คือ","(to) be/means","(to) be/means","Definition or explanation"],["อาศัย","to live","zu leben"],["พัก","to stay, to rest","bleiben, sich ausruhen"],["มี","to have","haben","~ There is/are"],["...ได้ ","Can","Kann"],["ได้","to get","zu bekommen"],["ชอบ","to like","zum Zuschauen"],["กิน","to eat","zum Essen"],["ทำ","to do/make","zu tun/machen"],["ไป","to go","zum Mitnehmen"],["ใช้","to use","zu verwenden"],["ซื้อ","to buy","zu kaufen"],["จ่าย","to pay","zu bezahlen"],["ขาย","to sell","zu verkaufen"],["รู้","to know","zu wissen","knowledge, fact"],["รู้จัก","to know ","zu wissen","name, person, place, thing"],["รู้สึก","to feel","fühlen"],["เรียน","to study/ learn","studieren/lernen"],["เริ่ม","to start","zum Starten"],["หยุด","to stop","anhalten"],["กลับ","to return","zurückkehren"],["ลืม","to forget","zu vergessen"],["เล่น","to play","zu spielen"],["จำ","to remember","zum Merken"],["พูด","to speak, say","sprechen, sagen"],["คุย","to talk","zum Reden","have a conversation back and forth"],["บอก","to tell","zu erzählen"],["เล่า","to tell (story)","(Geschichte) erzählen"],["เอา","to take","zu nehmen","for order"],["อยาก","to want","wollen"],["มา","to come","wird kommen"],["เตรียม","to get ready/ to prepare","sich vorbereiten"],["นอน","to lay down/ sleep","sich hinlegen/schlafen"],["ตื่น","to wake up","aufwachen"],["เดิน","to walk","zu Fuß"],["ถ่าย","to film, take (photo/video)","filmen, aufnehmen (Foto/Video)"],["สอน","to teach","zu lehren"],["อบ","to bake","zum Backen"],["รับ","to receive/pick up(someone)","jemanden in Empfang nehmen/abholen","to catch (if someone trow something to you)"],["ส่ง","to send","zum Senden"],["เปิด","to open","zum Öffnen"],["ปิด","to close","zum Schließen"],["เผา","to burn","zum Verbrennen"],["เจอ","to meet, to be found","sich treffen, gefunden werden"],["เผา","to burn","zum Verbrennen"],["หา","to find","zu finden"],["มาหา","come see(to)","komm und sieh (um)"],["ไปหา","go see(to)","gehe sehen"],["ออก","to exit","zum Verlassen"],["ขับ","to drive","zum Fahren"],["ขี่","to ride","zum Reiten"],["ถึง","to reach, to arrive","erreichen, ankommen"],["เสร็จ","to finish","zum Abschluss","pronouce เส็ด (false clusster)"],["จบ","[to] end;finish;come to an end","enden; beenden; zu Ende kommen"],["รอ","to wait","warten"],["จอด","to park","zum Parken"],["ทำความสะอาด","to clean","zum Reinigen"],["ทำงาน","to work","arbeiten"],["ทำอาหาร","to cook","zum Kochen"],["เก็บไว้","to keep","um zu behalten"],["บิน","to fly","fliegen"],["คิด","to think","zu denken"],["แนะนำ","to recommend/ introduce","empfehlen/einführen"],["ตรวจจับ","to detect","zum Erkennen"],["โยน","to hurl","werfen"],["ขว้าง","to throw","werfen"],["ปา","to throw","werfen"],["ให้","to give","geben"],["ใส่","to wear, put in/on","tragen, anziehen/anziehen","cloth, glasses, ring"],["โทร","to call (by phone)","anrufen (telefonisch)"],["ออกกำลัง","to exercise","zum Trainieren"],["เห็น","to see","um zu sehen"],["ดู","to look, watch","schauen, beobachten"],["เข้า","to enter","zum Eintragen"],["เที่ยว","to travel","zu reisen"],["คุม","to control","um zu kontrollieren"],["ตกปลา","to fish","zum Angeln"],["ตก","to fall","fallen"],["จับ","to catch","um zu fangen"],["เช่า","to rent","zu vermieten"],["ลอง","to try","zu versuchen"],["พา","to take","zu nehmen","someone"],["ยืน","to stand","stehen"],["ถาม","to ask","zu fragen"],["ตอบ","to respond, anwser","antworten, Antwort"],["ชิน","to be used, to be familiar with","zu verwenden, mit dem man vertraut sein sollte"],["เปลี่ยน","to change, Switch","zum Ändern, Umschalten"],["ชน","to collide with;hit;bump","zusammenstoßen; treffen; anstoßen"],["ปรึกษา","to discuss","zu besprechen"],["พิมพ์","to type, to text","tippen, Text"],["ซ่อม","to repair","zu reparieren"],["สั่ง","to order","um zu bestellen"],["ห้อย","to hang","zum Aufhängen"],["ช่วย","to help","um zu helfen"],["กังวล","to worry (about);feel anxious (about)","sich Sorgen machen (über); ängstlich sein (über)"],["ให้ดู","to show (just show)","zeigen (einfach zeigen)"],["อวด","to show off","um anzugeben"],["หาย","to be lost, be cured","Verloren sein, geheilt werden"],["ต้อง","must, have to","müssen, müssen"],["นั่ง","to sit","sitzen"],["ซ้อน","to sit behind the person who ride","hinter der Person sitzen, die reitet"],["อาบน้ำ","to shower","zum Duschen"],["ฝึก","to train, practice","trainieren, üben"],["สร้าง","to create, build","erschaffen, bauen"],["หัวเราะ","to laugh","zum Lachen"],["เลือก","to select/ choose","auswählen"],["สมัคร","[to] apply (for)","[um] sich zu bewerben (für)"],["เรียก","[to] call","[an] anrufen"],["เรียกว่า","[to] be called;be named","genannt werden; benannt werden"],["อ่าน","to read","zu lesen"],["เชิญ","[to] invite","[einladen]"],["วางแผน","[to] plan","[zu] planen"],["กัด","[to] bitten","gebissen"],["ตัดสินใจ","[to] decide","entscheiden"],["ลาป่วย","[to] take sick leave","[um] Krankheitsurlaub zu nehmen"],["ขอ","[to] ask for;request for;ask","[um] bitten; anfordern; fragen"],["อุ้ม","[to] carry;hold","tragen; halten"],["ฟัง","[to] listen","zuhören"],["กระโดด","[to] jump;leap","springen;hüpfen"],["ขยับ","[to] move;shift (slightly)","[bewegen; verschieben (leicht)"],["เพิ่ม","[to] increase, add","[zu] erhöhen, hinzufügen"],["ได้ยิน","[to] hear","[zu] hören"],["เรียบร้อย","[to be] ready;finish;completed\r\n(Referring to a task)","bereit sein; fertig; abgeschlossen\n(Bezieht sich auf eine Aufgabe)"],["จอง","[to] reserve;book;hold","[reservieren; buchen; halten]"],["ปล่อย","[to] release;let go;set free","[freigeben]; loslassen; befreien"],["อธิบาย","[to] explain","[zu] erklären"],["แก้","[to] fix;solve"],["คำนาม","Verb","Verb"],["ก๋วยเตี๋ยว","noodle","Nudel"],["เครื่องบิน","Airplane","Flugzeug"],["หน้าต่าง","Window","Fenster"],["หลอดไฟ","Light bulb","Glühbirne"],["นาฬิกา","watch/clock/ o'clock","Uhr/Uhrzeit","use as a Noun/ for tells time 24 hr. system"],["มังสวิรัติ","vegetarian","Vegetarier"],["แวมไพร์","Vampire","Vampir"],["ม้า","horse","Pferd"],["หมา","dog","Hund"],["วัว","cow","Kuh"],["ไก่","chicken","Huhn"],["หมู","pig","Schwein"],["เนื้อ","meat/beef","Fleisch/Rindfleisch"],["เนื้อวัว","beef","Rindfleisch"],["ผัก","Vegetable","Gemüse"],["ข้าวเหนียว","Sticky rice","Klebreis"],["หมอ","Doctor","Arzt"],["เดิน","to walk","zu Fuß"],["เก้าอี้","Chair","Stuhl"],["บันได","Ladder","Leiter"],["โต๊ะ","Table","Tisch"],["ตู้","Cabinet","Kabinett"],["ประตู","Door","Tür"],["รถ","Car","Auto"],["จอ","Monitor/screen","Monitor/Bildschirm"],["พัดลม","Fan","Lüfter"],["ตู้เย็น","Refrigerator","Kühlschrank"],["งาน","work","arbeiten"],["มือถือ","phone (mobile) ","Telefon (Mobiltelefon)"],["โทรศัพท์","phone (any kind)","Telefon (jeglicher Art)"],["โรงแรม","hotel","Hotel"],["โรงหนัง","cinema","Kino"],["โรงงาน","Factory","Fabrik"],["โรงเรียน","School","Schule"],["โรงพยาบาล","Hospital","Krankenhaus"],["ห้องน้ำ","restroom, toilet, bathroom","Toilette, Badezimmer"],["ห้องครัว","kitchen","Küche"],["ห้องนั่งเล่น","Living room","Wohnzimmer"],["ห้อง","room","Zimmer"],["คนเดียว","Alone, only person","Allein, einzige Person"],["ตัวเดียว","only animal","einziges Tier"],["ครู","Teacher","Lehrer"],["แม่","mother","Mutter"],["พ่อ","father","Vater"],["เมือง","City","Stadt"],["เวลา","Time","Zeit"],["ยา","medicine","Medizin"],["ครึ่ง","half","Hälfte"],["สูง","tall","groß"],["น้ำหนัก","weight","Gewicht"],["คำ","word","Wort"],["เงินสด","Cash","Kasse"],["ชื่อ","name","Name"],["ข้าว","rice","Reis"],["เพื่อน","Friend","Freund"],["แฟน","Girl/Boy friend","Freundin/Freund"],["นักเรียน","student","Student"],["ขนมปัง","Bread","Brot"],["ราคา","price","Preis"],["แว่นตา","Glasses","Gläser"],["หนังสือ","book","Buch"],["หนัง","movie","Film"],["กระเป๋า","Bag","Tasche"],["เป้","backpack","Rucksack"],["เงิน","Money","Geld"],["ตังค์","Money","Geld","casual"],["ภาคเหนือ","Northern","Nördlich"],["ภาคใต้","Southen","Südlich"],["ภาคตะวันออก","Eastern","Östlich"],["ภาคตะวันตก","Western","Western"],["ประเทศ","Country","Land"],["จังหวัด","province","Provinz"],["แดด","sunlight","Sonnenlicht"],["วันเกิด","Birthday","Geburtstag"],["ฝน","rain","Regen"],["ของ","stuff","Sachen"],["ฤดู","season","Jahreszeit","read as รึดู"],["ฤดูใบไม้ร่วง","Autumn ","Herbst ","leaves Falling "],["ฤดูใบไม่ผลิ","Spring","Frühling","leaves blossom"],["หน้า","season(casual)","Saison (Freizeit)","only ร้อน, ฝน, หนาว"],["ธนาคา","Bank","Bank"],["ผู้หญิง","woman/female","Frau/weiblich"],["ผู้ชาย","man/male","Mann/männlich"],["ส่วน","part","Teil"],["ชายหาด","beach","Strand"],["ทะเล","sea, ocean","Meer, Ozean"],["แม่น้ำ","River","Fluss"],["กุ้ง","shrimp, prawn","Garnelen, Krabben"],["ปลา","fish","Fisch"],["น้ำตก","waterfall","Wasserfall"],["เรือ","ship, boat","Schiff, Boot"],["มหาวิทยาลัย","University","Universität"],["มหาลัย","University","Universität","speaking"],["ม.","University","Universität"],["ขี้","shit, poop","Scheiße, Kacke"],["ถนน","street, road","Straße, Weg","ถะ - หนน"],["ตัวอย่าง","example","Beispiel"],["แถว","row, line, column","Zeile, Linie, Spalte"],["กระจก","mirror","Spiegel"],["ใบเสนอราคา","quotation","Zitat"],["แผน","plan","planen"],["วันหยุด","holiday;vacation","Urlaub; Ferien"],["อดีต","the past, Ex..","die Vergangenheit, z. B."],["ท้อง","belly, abs","Bauch, Bauchmuskeln"],["ความคืบหน้า","Progress","Fortschritt"],["ประชุม","a meeting","ein Treffen"],["เพื่อนร่วมงาน","colleague","Kollege","friend join work"],["ค่าไฟ","electricity bill","Stromrechnung"],["ค่าน้ำ","water bill","Wasserrechnung"],["ค่าปรับ","a fine ","eine Geldstrafe"],["กล่อง","box","Kasten"],["ข้อความ","message","Nachricht"],["จดหมาย","mail, post","Post"],["ตำรวจ","Police","Polizei"],["ชามอาหารแมว","Cat food bowl","Katzenfutternapf"],["ช่าง","technician;mechanic;engineer","Techniker; Mechaniker; Ingenieur"],["เจ้าของ","owner","Eigentümer"],["เลข","number","Nummer"],["ปัญหา","question;trouble","Frage; Problem"],["มือ","hand","Hand"],["ผลไม้","Fruit","Frucht"],["ฝรั่ง","guava","Guave"],["กล้วย","banana","Banane"],["มะพร้าว","Coconut","Kokosnuss"],["สรรพนาม","pronoune","Pronomen"],["ผม","I","ICH","polite (for male speaker)"],["ฉัน","I","ICH","polite (for female speaker)"],["คุณ","you","Du","polite"],["เขา","He/She","Er/Sie"],["เธอ","She","Sie","usally book"],["(พวก)เรา","We","Wir"],["(พวก)เขา","They","Sie"],["ลักษณะนาม","Classifier/Mesurement/quantifier","Klassifikator/Messung/Quantifikator"],["คน","people","Menschen"],["ตัว","classifier every type of animal, all pieces of clothing...","Klassifikator: alle Tierarten..."],["อัน","used for many small objects","wird für viele kleine Gegenstände verwendet"],["กิโลกรัม","Kilogram","Kilogramm"],["กรัม","gram","Gramm"],["ลูก","small and round shaped - mostly fruit and types of balls.","klein und rundlich - meist Früchte und verschiedene Arten von Bällen."],["เครื่อง","electrical appliances like TVs, computers, phones...","Elektrische Geräte wie Fernseher, Computer, Telefone..."],["คัน","cars and other vehicles except planes or boats.","Autos und andere Fahrzeuge ausgenommen Flugzeuge und Boote."],["ปี","years and years of age","Jahre und Jahre alt"],["วัน","Day","Tag","."],["เดือน","Month","Monat"],["แก้ว","Glass/cup","Glas/Tasse"],["ขวด","bottle","Flasche"],["ใบ","types of containers (bags, boxes, bowls, buckets, cans, cups etc)","Arten von Behältern..."],["คำ","word","Wort"],["อย่าง","referring to types, kinds or sorts of objects.","sich auf Arten, Sorten oder Arten von Objekten beziehend."],["ชนิด","for a type, sort or kind of something..","für eine Art, Sorte oder Art von etwas.."],["แบบ","model;style;way","Modell; Stil; Art"],["ชิ้น","classifier for a piece of something","Klassifikator für ein Stück von etwas"],["มื้อ","meal (Classifier for a meal)","Mahlzeit (Klassifikator für eine Mahlzeit)"],["คำบุพบท","Preposition","Präposition"],["ระหว่าง","in between","dazwischen"],["ข้างๆ","beside-next to, side","neben, neben, Seite"],["ตรงข้าม","opposite","Gegenteil"],["ใน","in","In"],["หลัง","behide, back","dahinter, zurück"],["บน","on top","oben"],["ขึ้น","up","hoch"],["ใต้","below/under","unten/unter"],["ลง","down","runter"],["หน้า","in front","vorne"],["แถว","around","um"],["จาก","from","aus"],["ใกล้","near","nahe"],["ไกล","far","weit"],["รอบ","around;round","rundherum;rund"],["วัน เวลา","Day-Time","Tageszeit"],["ช่วงนี้","lately, recently","in letzter Zeit, kürzlich"],["ช่วงก่อน","a little while ago (not conect with the present)"],["วันนี้","Today","Heute"],["พรุ่งนี้","Tomorrow","Morgen"],["วันมะรืน","Day after tomorrow","Übermorgen"],["เมื่อวาน","Yesterday","Gestern"],["เมื่อวานซืน","Day before yesterday","Vorgestern"],["เมื่อคืน","Last night","Letzte Nacht"],["เมื่อกี้","just now;a moment ago","eben; vor einem Augenblick"],["ตอนเช้า","Morning","Morgen"],["ตอนกลางวัน","afternoon/ day time","Nachmittag/Tag"],["ตอนเย็น","Evening","Abend"],["ตอนกลางคืน","Night","Nacht"],["ตอนนี้","Now","Jetzt","When + This"],["หลังจากนี้","After this","Danach","Back + from + This"],["ก่อนหน้านี้","Before this","Vorher","Before + front + This"],["นาที","minute","Minute"],["ชั่วโมง","hour","Stunde"],["สัปดาห์","Week","Woche","proper word"],["อาทิตย์","","Woche","speaking language"],["สุดสัปดาห์","Weekend","Wochenende","proper language"],["เสาร์อาทิตย์","Weekend","Wochenende","speaking language"],["วันธรรมดา","Weekday","Wochentag","proper language"],["วันทำงาน","Weekday","Wochentag","speaking language"],["อาทิตย์หน้า","Next week","Nächste Woche"],["อาทิตย์หน้าของหน้า","Week afer next week","Übernächste Woche","speaking language"],["อาทิตย์ถัดไป","","übernächste Woche","proper language"],["เดือน","month","Monat"],["เดือนหน้า","next month","nächsten Monat"],["ปี","year","Jahr"],["ปีที่แล้ว","last/previous year","letztes/vorheriges Jahr"],["ครั้ง","Time, occasion","Zeit, Anlass","ex. 3 times, 8 times"],["ระบบเวลาไทย","Thai time system","Thailändisches Zeitsystem"],["ตี","1 a.m. - 5 a.m.","1 Uhr - 5 Uhr","ตี + number "],["โมงเช้า","6 a.m. - 11 a.m.","6 Uhr - 11 Uhr","number + โมงเช้า"],["เที่ยงวัน","12 p.m.","12 Uhr mittags","midday"],["บ่าย","1 p.m. - 4 p.m.","13 Uhr - 16 Uhr","บ่าย + number"],["โมงเย็น","5 p.m. - 6 p.m.","17 Uhr - 18 Uhr","number + โมงเย็น"],["ทุ่ม","7 p.m. - 11 p.m.","19 Uhr - 23 Uhr","number + ทุ่ม"],["เที่ยงคืน","00 a.m.","0 Uhr","midnight"],["สี","color","Farbe"],["สีดำ","Black","Schwarz"],["สีขาว","White","Weiß"],["สีส้ม","Orange","Orange"],["สีเขียว","green","Grün"],["สีฟ้า","blue sky","blauer Himmel"],["สีน้ำเงิน","ิblue","Blau"],["สีเหลือง","yellow","Gelb"],["สีม่วง","purple","lila"],["สีแดง","red","Rot"],["ประโยคมีประโยชน์","useful phrase","nützlicher Ausdruck"],["ไม่แน่ใจ","Not sure","Ich bin mir nicht sicher."],["ความจริง","truth, fact, reality","Wahrheit, Fakt, Realität"],["ไปเลย","you go (I won't)","Du gehst (ich nicht)"],["แปปนึง","a moment","einen Moment","casual"],["สักครู่","","einen moment","formal"],["ใครมา","~ Who is that?","~ Wer ist das?","Who + come"],["มาแล้ว","~ I'm back","Ich bin zurück","come + already"],["ล้อเล่น","~ just kidding","~ Nur ein Scherz","casual"],["สติแตก","~ goes crazy, freak out","~ dreht durch, flippt aus","consciousness + break"],["ทุกอย่าง","~ everything","~ alles"],["ก็เลย","~ So.. , as a result","Also… als Ergebnis"],["พูดอีกครั้งได้ไหม","~ can you repeat?","Können Sie das wiederholen?","say another time Can ?"],["แค่นี้","only this, thats all","Nur das, das ist alles."],["นานมาแล้ว","Long time ago","Vor langer Zeit"],["เข้าใจได้","Makes sense","Das macht Sinn"],["แน่นอน","~Of course! definitely","Natürlich! Auf jeden Fall."],["คิดว่ายังไง","~What do you think?","Was denkst du?"],["ใครบางคน","~ Someone","~ Jemand"],["อะไรบางอย่าง","~ Something","~ Etwas"],["เกิดอะไรขึ้น","~ What happened","Was geschah?"],["ว่าแล้ว","~ I said it. like I said. I knew it"],["จริงๆแล้ว","~ Actually"],["Filler words","Filler words","Füllwörter"],["ก็เลย","as result, So...","Folglich..."],["ก็"],["แล้ว","so..","Also.."],["แล้วก็","then.., And..","dann.., Und..","ละก็ (real speed sound like)"],["อ่า","aaaa","aaaa"],["แบบ","like","wie"],["แบบว่า","like","wie"],["แบบนี้","like this","so was"],["อะไรแบบนี้","something like this/that","so etwas/das"],["นั่นไง","right there!","Genau da!"],["ส่วนต่างๆของร่างกาย","Body parts","Körperteile"],["ขา","Leg","Bein"],["หัวไหล่","shoulder","Schulter"],["หน้า","face","Gesicht"],["หัว","head","Kopf"],["คอ","neck","Nacken"],["ตา","eyes","Augen"],["อาหาร"],["ไก่ผัดเม็ดมะม่วง"],["ไก่ทอด"],["ไข่ดาว"],["ไข่เจียว/ไข่ทอด"],["ข้าวโพด"],["ถั่ว"],["ผัก"],["ปิ้งย่าง"],["มะเขือเทศ"],["แตงกวา"]]

# SECTION TRACKING
SECTION_HEADERS = {'คำกริยา','คำนาม','สรรพนาม','ลักษณะนาม','คำบุพบท','วัน เวลา','สี',
                   'ประโยคมีประโยชน์','ส่วนต่างๆของร่างกาย','อาหาร','ระบบเวลาไทย','Filler words'}
SECTION_NAMES  = {'คำกริยา':'verbs','คำนาม':'nouns','สรรพนาม':'pronouns',
                  'ลักษณะนาม':'classifiers','คำบุพบท':'prepositions','วัน เวลา':'time',
                  'สี':'colors','ประโยคมีประโยชน์':'phrases','ส่วนต่างๆของร่างกาย':'body',
                  'อาหาร':'food','ระบบเวลาไทย':'time','Filler words':'fillers'}

words = []
seen_thai = set()
current_cat = 'general'
word_id = 1

for row in wordrecap_rows:
    thai = clean(row[0]) if len(row) > 0 else ''
    eng  = clean(row[1]) if len(row) > 1 else ''
    ger  = clean(row[2]) if len(row) > 2 else ''
    note = clean(row[3]) if len(row) > 3 else ''

    # section header?
    if thai in SECTION_HEADERS or not has_thai(thai):
        if thai in SECTION_NAMES:
            current_cat = SECTION_NAMES[thai]
        continue

    # must have Thai and English
    if not has_thai(thai) or not eng or eng in ('?',):
        continue

    # skip pure header row
    if thai == 'ภาษาไทย':
        continue

    # deduplicate on thai text
    if thai in seen_thai:
        continue
    seen_thai.add(thai)

    words.append({
        'id': word_id,
        'thai': thai,
        'english': eng,
        'german': ger,
        'notes': note,
        'category': current_cat,
        'source': 'Wordrecap'
    })
    word_id += 1

# ── NUMBERS ───────────────────────────────────────────────────────────────────
number_rows = [["Number","ตัวเลข","transliteration","Deutsch"],["0","ศูนย์","Ṣ̄ūny̒","Null"],["1","หนึ่ง","nèung","Eins"],["2","สอง","sŏng","Zwei"],["3","สาม","săam","Drei"],["4","สี่","sèe","Vier"],["5","ห้า","hâa","Fünf"],["6","หก","hòk","Sechs"],["7","เจ็ด","jèt","Sieben"],["8","แปด","bpàet","Acht"],["9","เก้า","gâo","Neun"],["10","สิบ","sìp","Zehn"],["*11","สิบเอ็ด","sìp-èt","Elf"],["12","สิบสอง","sìp sŏng","Zwölf"],["13","สิบสาม","sìp săam","Dreizehn"],["14","สิบสี่","sìp sèe","Vierzehn"],["15","สิบห้า","sìp hâa","Fünfzehn"],["16","สิบหก","sìp hòk","Sechenzehen"],["17","สิบเจ็ด","sìp jèt","Siebzehn"],["18","สิบแปด","sìp bpàet","Achtzehn"],["19","สิบเก้า","sìp gâo","Neunzehn"],["*20","ยี่สิบ","yêe sìp","Zwanzig"],["21","ยี่สิบเอ็ด","yêe sìp-èt","Ein und zwanzig"],["22","ยี่สิบสอง","yêe sìp sŏng"],["~"],["30","สามสิบ","săam sìp"],["40","สี่สิบ","sèe sìp"],["50","ห้าสิบ","hâa sìp"],["60","หกสิบ","hòk sìp"],["70","เจ็ดสิบ","jèt sìp"],["80","แปดสิบ","bpàet sìp"],["90","เก้าสิบ","gâo sìp"],["100","(หนึ่ง)ร้อย","(nèung)rói"],["1,000","(หนึ่ง)พัน","(nèung)pan"],["10,000","(หนึ่ง)หมื่น","(nèung)mèun"],["100,000","(หนึ่ง)แสน","(nèung)săen"],["1,000,000","(หนึ่ง)ล้าน","(nèung)láan"]]

for row in number_rows:
    num  = clean(row[0]) if len(row) > 0 else ''
    thai = clean(row[1]) if len(row) > 1 else ''
    rom  = clean(row[2]) if len(row) > 2 else ''
    ger  = clean(row[3]) if len(row) > 3 else ''

    if not has_thai(thai) or thai in seen_thai:
        continue
    seen_thai.add(thai)

    eng_label = f"{num} ({rom})" if rom else num
    words.append({
        'id': word_id,
        'thai': thai,
        'english': eng_label,
        'german': ger,
        'notes': f"romanization: {rom}" if rom else '',
        'category': 'numbers',
        'source': 'Number'
    })
    word_id += 1

# ── DAYS / MONTHS ─────────────────────────────────────────────────────────────
daymonth_rows = [["วัน","wan","tag"],["วันจันทร์","wan jan","Montag","Moon"],["วันอังคาร","wan ang-kaan","Dienstag","Mars"],["วันพุธ","wan pút","Mittwoch","Mercury"],["วันพฤหัส(บดี)","wan pá-réu-hàt-(sà-bor-dee)","Donnerstag","Jupiter"],["วันศุกร์","wan sùk","Freitag","Venus"],["วันเสาร์","wan săo","Samstag","Saturn"],["วันอาทิตย์","wan aa-tít","Sonntag","Sun"],["เดือน","deuuan","Monat"],["มกราคม","mók-gà-raa kom","Januar"],["กุมภาพันธ์","gum-paa pan","Februar"],["มีนาคม","mee-naa kom","März"],["เมษายน","may-săa-yon","April"],["พฤษภาคม","préut-sà-paa kom","Mai"],["มิถุนายน","mí-tù-naa-yon","Juni"],["กรกฎาคม","gà-rá-gà-daa-kom","Juli"],["สิงหาคม","sĭng hăa kom","August"],["กันยายน","gan-yaa-yon","September"],["ตุลาคม","dtù-laa-kom","Oktober"],["พฤศจิกายน","préut-sà-jì-gaa-yon","November"],["ธันวาคม","tan-waa kom","Dezember"]]

DAY_EN = {'วันจันทร์':'Monday','วันอังคาร':'Tuesday','วันพุธ':'Wednesday',
          'วันพฤหัส(บดี)':'Thursday','วันศุกร์':'Friday','วันเสาร์':'Saturday','วันอาทิตย์':'Sunday'}
MONTH_EN = {'มกราคม':'January','กุมภาพันธ์':'February','มีนาคม':'March',
            'เมษายน':'April','พฤษภาคม':'May','มิถุนายน':'June',
            'กรกฎาคม':'July','สิงหาคม':'August','กันยายน':'September',
            'ตุลาคม':'October','พฤศจิกายน':'November','ธันวาคม':'December'}

for row in daymonth_rows:
    thai = clean(row[0]) if len(row) > 0 else ''
    rom  = clean(row[1]) if len(row) > 1 else ''
    ger  = clean(row[2]) if len(row) > 2 else ''

    if not has_thai(thai) or thai in seen_thai:
        continue
    seen_thai.add(thai)

    eng = DAY_EN.get(thai) or MONTH_EN.get(thai) or rom
    cat = 'days' if thai in DAY_EN else 'months'
    words.append({
        'id': word_id,
        'thai': thai,
        'english': eng,
        'german': ger,
        'notes': f"romanization: {rom}" if rom else '',
        'category': cat,
        'source': 'Day/month'
    })
    word_id += 1

# ── SENTENCES ─────────────────────────────────────────────────────────────────
sentence_rows = [[" ","Eng translate","Deutsch"],["ผมขอ...sth you need.. หน่อย","Can I please have ...st you need.. "],["จาก..place..ไป..place..","from..place..to..place"],["(person)หา..(obj)..ไม่เจอ ","(person)cannot find..(obj).."],["Verb.. รึยัง","Have you ..Verb.. yet?"],["ผมส่ง..st..ให้คุณ","I send..st..to you"],["V. เล่นๆ","V. not serious(for fun)"],["ไม่มีอะไร ..verb..","There's nothing to ..verb.."],["ทำงานกี่โมงถึงกี่โมง","Work from What time to What time"],["เอากาแฟร้อน 1 แก้วไม่หวาน อีก 1 แก้วหวาน","Take coffee 1 cup no sweet another 1 cup sweet"],["ผมคิดว่า..explain things you think","I think (that)...."],["ผมรู้ว่า..explain things you know","I know (that) ...."],["จะถึง....เมื่อไหร่","Will arrive ..... When?"],["Verb..อีกแล้วเหรอ","Verb..Again already really?"],["Verb..อีกครั้งได้ไหม","Verb..more  time Can ?"],["Verb..อีก 3 ครั้งได้ไหม","Verb.. more 3 time Can ?"],["เขาโทรหาผม","He calls (to find) Me"],["ผมก็ไปออกกำลัง","I also go exercise"],["เคย..Verb.. ไหม","You ever ..Verb.. ?"],["P1 ให้ P2 ช่วย ..","P1 ask for help from P2"],["P1 ให้ P2 ช่วย... ไหม","P2 offer help to  P1"],["P1 ช่วย P2... ได้ไหม","P1 help P2 ... Can?"],["ผมมีแมว 1 ตัว","I have cat 1 (cf)"],["ผมมีแมวตัวเดียว","I have cat (cf) only"],["ใช้เวลากี่ชั่วโมง/นาที/วัน","How many hours/minute/days does it take?"],["ใช้เวลาเท่าไร","How long does it take?"],["A โดน B + verb(B did to A)"],["ผมโดนหมากัด","I got bitten by a dog"],["ผมโดนตำรวจปรับ","I got fined by a police"],["BYD คันนี้เป็นแบบที่ผมชอบ","This BYD is the type that I like."],["ผู้หญิงคนนี้เป็นคนที่ผมรักที่สุด","This woman is the person that I love most."],["อาหารไทยจานนี้เป็นอาหารชนิดที่ผมชอบที่สุด","This Thai dish is the type that I like the most."],["เยอรมันเป็นภาษาที่ยากที่สุด","German is the language that's the hardest."],["ที่นี่เป็นที่ที่ผมชอบที่สุด","This is the place where I like the most."],["กำลัง..Verb..อะไรกัน","What are you(guys) ..Verb..ing"],["คุณกินอะไร(บ้าง)","You eat What (any)"],["ผมไม่ได้กินอะไรเลย","I not did eat anything at all"],["ที่บ้านมีใครอยู่(บ้าง)","at home have Who be (any)"],["ที่บ้านไม่มีใครอยู่เลย","at home No have someone be at all"],["ในSW มีเกมอะไร(บ้าง)","in SW have game What (any)"],["ในSW ไม่มีเกมอะไรเลย","in SW No have game anthing at all"],["วันนี้ได้ออกกำลัง(บ้าง)ไหม","Today did workout (any)?"],["วันนี้ไม่ได้ออกกำลังเลย","Today No did workout at all"],["สอนนักเรียนกี่ชั่วโมงต่อคน","teach student How many hour per person"],["ทำงานกี่ชั่วโมงต่อวัน","Work How many hour per day"],["นั่นคือทั้งหมดที่กินวันนี้ไหม","That is all that eat today ?"],["ไปไหนมา","Where have you been (very recently)"],["กินซูชิ(ที่)ไหนมา","Where did you eat sushi (last place/recently)"],["สั่งมาแล้ว","I've already ordered(an item is with you/on the way)"],["จะไปกินข้าวหรือยัง","Will go eat or not"],["จะไปแล้ว","will go NOW (about to go)"],["ยังไม่ไป","still no go (not yet)"],["ผมพรีเซนต์ให้คนฟัง","I present for people to listen"],["ผมทำหนังให้แม่ผมดู","I make movie for mom me to listen"],["ผมซื้อเสื้อตัวนี้ให้คุณใส่","I buy shirt this for you to wear"],["โทรศัพท์ใช้ได้ไหม","Is the phone usable?"],["ใช้โทรศัพท์ได้ไหม","Can I use the phone"],["เล่นกีตาร์เป็นไหม","Do you know how to play the guitar?"],["เล่นกีตาร์ได้ไหม","Can you play the guitar. (now)"],["โต๊ะนี้คือโต๊ะเดียวกันกับโต๊ะนั้น","This table is the same one as that table."],["คนนี้คือคนเดียวกันกับคนนั้น","This person is the same one as that person ."]]

sentences = []
sent_id = 1
for row in sentence_rows:
    thai = clean(row[0]) if len(row) > 0 else ''
    eng  = clean(row[1]) if len(row) > 1 else ''
    ger  = clean(row[2]) if len(row) > 2 else ''

    if not has_thai(thai) or not eng:
        continue

    sentences.append({
        'id': sent_id,
        'thai': thai,
        'english': eng,
        'german': ger,
        'source': 'Sentence'
    })
    sent_id += 1

# ── RECALL ────────────────────────────────────────────────────────────────────
recall_raw = [["03.09.2026"],["วันนี้ทั้งวันผมไม่กินอะไรเลย","ทั้งวัน - all day"],["วันนี้ทั้งวันผมไม่กินอะไรเลย","อะไรเลย - anything at all"],["วันนี้อย่างแรกผมไปที่ DLT","อย่างแรก - first thing first"],["ยังไม่กลับบ้าน","ยัง - still"],["ผมสอน5คนแบบไม่หยุด","แบบไม่หยุด - like Nonstop"],["ผมเป็นคนสุดท้าย","สุดท้าย - the last"],["ผมเป็นนักเรียนคนสุดท้าย","นักเรียน - student"],["ผมเป็นคนรองสุดท้าย","รองสุดท้าย - second last"],["ผมคิดว่า My hero : vigilantes เป็นเรื่องก่อนหน้า academia","เรื่อง - story, matter"],["ผมคิดว่า My hero : vigilantes เป็นเรื่องก่อนหน้า academia","ก่อนหน้า - before"],["ผมเล่น RE :9 จบ 2 ครั้ง แล้ว","จบ - to end , finish (from start to the end)"],["RE :9 ไม่เครียดแต่น่ากลัว ","น่ากลัว - scary"],["RE :9 ไม่เครียดแต่น่ากลัว ","แต่ - but"],["03.13.2026"],["อยากเล่นแต่ไม่รู้จะเล่นเมื่อไหร่","เมื่อไหร่ - When"],["ขอ..example.. หน่อย","ขอ - to beg/ask for"],["ทั้งอาทิตย์ผมทำแค่งาน","ทั้ง - a whole"],["แฟนเพื่อน","friend's GF"],["แฟนใหม่เพื่อน","friend's new GF"],["แฟนใหม่เพื่อนผม","My friend's new GF"],["บ้านใหม่แฟนผม","My GF's new House"],["มือถือใหม่แฟนเพื่อนผม","My friend's GF new phone"],["03.17.2026"],["มื้อแรก(ของ)วันนี้ของผม","My today's 1st meal "],["น้ำอย่างแรก(ของ)วันนี้ของคุณคืออะไร","น้ำอย่างแรก - Water type(cf) 1st \n~ First drink"],["คุณซื้อมัทฉะเมื่อไหร่"],["คุณซื้อมัทฉะ[แก้วนี้]เมื่อไหร่","matcha cup this"],["คุณซื้อมัทฉะ[แก้วนี้]ที่ไหน","matcha cup this"],["คุณซื้อมัทฉะ[แก้วนี้]กี่โมง","matcha cup this"],["คุณซื้อมัทฉะ[แก้วนี้]ทำไม","matcha cup this"],["ถ้าผมอยู่ที่บ้าน ผมกิน americano","ถ้า - if"],["เมื่อวานผมเบื่อ americano","เบื่อ - [to] be bored (of)"],["ร้านนี้ขายมัทฉะ","ขาย - to sell"],["ร้านนี้ขายแค่มัทฉะ","แค่ - only"],["ผมอยากลองมัทฉะ(1)แก้ว ละ 1,000 บาท","ลอง - to try\nละ - per don't forget to flip order\nEng 1,000 per 1 cup\nThai 1 cup ละ 1,000"],["วัน ละ กี่มื้อ","How many meal per day"],["วัน ละ 2 มื้อ","2 meal per day"],["วัน ละ กี่ ชม.","ชม. =  ชั่วโมง - hour"],["วัน ละ 8 ชม."],["ถ้าเล่นเกม ผมเล่นแค่ วันละ 30 นาที","ถ้า - if\nแค่ - only"],["03.17.2026"],["Meeting ส่วนใหญ่","part + big ~ majority.."],["ไม่ค่อยได้อะไร","not really get sth"],["ไม่ค่อยมีอะไร","not really have sth"],["บางMeetingไม่จำเป็น","necessary"],["เกมในPS5 ไม่ใหม่ แต่ เกมในPC ใหม่","[to be] new"],["มาวันไหน","come day which\n~ When it be released"],["03.23.2026"],["ผมหิว ก็เลย ไปกินข้าว","ก็เลย - so, therefore"],["ผมเห็นบางอย่างบนอันนี้ ก็เลย checkใต้ laptop","ก็เลย - so, therefore"],["ผมไม่เคยได้ยิน","เคย - ever / used to"],["ผมไม่เคยได้ยิน","ได้ยิน - to hear"],["03.27.2026"],["เพื่อนผมพิมพ์หาผม","พิมพ์หา - to type to.."],["เราไปกินกาแฟด้วยกัน","ด้วยกัน - together"],["ผมว่าง จ. พ. ศ.","ว่าง - to be free [time]"],["ผมเจอ จ. พ. ศ.  ได้","เจอ...ได้ - able to meet"],["จะบอกอีกที","will tell later/anther time"],["ผมสังเกตว่า...","สังเกต - to notice"],["ผมรอเพื่อนพิมพ์หาผมมาทั้งอาทิตย์","มา in this case to show the time has been travelling from past >> present"],["ผม โดน เพื่อน เมิน","~ I'm being ignored by my friends."],["เพื่อนผมสัญญาผมแล้ว","สัญญา - to promise"],["เพื่อนผมบอกว่าผมผิด","ผิด - [to be] wrong"],["เปิดไฟเลี้ยว","turn-on light turn"],["03.30.2026"],["ช่วงนี้มีงานหนังสือ","ช่วงนี้ - Lately"],["ไม่ดูข่าว","ข่าว - News"],["แบต 1 ลูก ราคา 20,000","ลูก - cf- for battery (in this case)\nราคา - price"],["ก่อนเมื่อวาน ผมเล่นเกมนี้จบ 5 ครั้งแล้ว","ก่อนเมื่อวาน - Before yesterday"],["เคยเล่น sekiro มาก่อนไหม","เคย+verb+....มาก่อนไหม \nhave you ever + Verb... before?"],["ผมส่งเงินให้คุณ","ให้ - to give (in this case works like \"to\")"],["ผมซื้อดอกไม้ให้มาย","ให้ - to give (in this case works like \"to\")\nดอกไม้ - flower"],["ผมทำผัดกะเพราะให้คุณ","ให้ - to give (in this case works like \"to\")"],["04.04.2026"],["บางครั้งร่างกายผมต้องนอน 10 ชั่วโมง","ร่างกาย - body"],["บางครั้งร่างกายผมต้องนอน 10 ชั่วโมง","ต้อง - must / have to + V."],["ผมลืมชื่อบริษัท","บริษัท - company"],["ผมจำชื่อบริษัทไม่ได้","จำ...ไม่ได้ - Don't remember"],["อันดับที่1","1st step"],["อันดับแรก"],["ผมรู้จักเขาแค่ 3 เดือน","แค่ - only"],["04.10.2026"],["มานูเป็นเจ้าของใหม่","เจ้าของ - owner"],["เจ้าของเก่าใช้แค่ 4 เดือน","เก่า - old(thing) /ex / former"],["ทางเข้า"],["ทางออก"],["บริษัทส่งออกรถ","Car export company"],["วันที่ 13 ไปเล่นน้ำที่สีลม","วันที่ - date"],["ผมไม่เป็นเพื่อนกับเขาอีกต่อไป","อีกต่อไป - anymore"],["ยังมี Line ของเขาไหม","เขา - he/she/him/her (3rd person)"],["ถ้าขายจอ จะขายกี่บาท","ถ้า - if\nจอ - screen / monitor"],["Pebble มีปัญหาอะไร","ปัญหา - problem"],["คุณเป็นใคร","You are Who"],["04.17.2026"],["รู้สึกว่า..คนที่เล่นน้ำ ไม่ใช่คนไทย","people who play water"],["คนส่วนใหญ่","people + part + big"],["ิที่เชียงใหม่เล่นน้ำทั้งอาทิตย์ไหม","at chiangmai play water a whole week ?"],["ไม่มีเหตุผล","เหตุผล - reason"],["A อยากให้ B พูด","A want B to speak"],["ผมอยากให้นิติ Fix Taobin ให้ผม","นิติ - juristic person"],["ผมอยากให้นิติ Fix Taobin ให้ผม","อยากให้ - Want\nให้ - for/to"]]

recall = []
rec_id = 1
current_date = ''

for row in recall_raw:
    col0 = clean(row[0]) if len(row) > 0 else ''
    col1 = clean(row[1]) if len(row) > 1 else ''

    # date header
    if re.match(r'^\d{2}\.\d{2}\.\d{4}$', col0):
        current_date = col0
        continue

    if not has_thai(col0):
        continue

    # parse keyword from col1: "ทั้งวัน - all day"
    keyword = ''
    key_translation = ''
    if ' - ' in col1:
        parts = col1.split(' - ', 1)
        keyword = clean(parts[0])
        key_translation = clean(parts[1])
    elif col1:
        key_translation = col1

    recall.append({
        'id': rec_id,
        'date': current_date,
        'thai': col0,
        'keyword': keyword,
        'keyTranslation': key_translation
    })
    rec_id += 1

# ── OUTPUT ────────────────────────────────────────────────────────────────────
vocab = {'words': words, 'sentences': sentences, 'recall': recall}

with open('D:/AI_Project/thai_learning_app/src/data/vocab.json', 'w', encoding='utf-8') as f:
    json.dump(vocab, f, ensure_ascii=False, indent=2)

# Summary
from collections import Counter
cats = Counter(w['category'] for w in words)
print("vocab.json written")
print(f"Words: {len(words)}")
for cat, count in sorted(cats.items()):
    print(f"  {cat}: {count}")
print(f"Sentences: {len(sentences)}")
print(f"Recall entries: {len(recall)}")
