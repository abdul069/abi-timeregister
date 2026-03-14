import { useState, useMemo } from "react";

const EVENTS = [
  // ═══════════════════════════════════════════════════
  // ARKA PLAN
  // ═══════════════════════════════════════════════════
  {
    id: 1, date: "Ara 2025 – Oca 2026", day: -60, phase: "prelude",
    actor: "iran_internal", type: "protests",
    title: "İran'da Dev Protestolar & Katliam",
    location: "İran geneli", lat: 32.4279, lng: 53.6880,
    munition: "Ateşli silah / Gözaltı",
    sources: [
      { label: "HRANA (İran muhalefet): 7.000+ ölü", side: "iran_opp" },
      { label: "İran Sağlık Bakanlığı: 3.117 ölü", side: "iran_gov" },
      { label: "Trump / Batı: 32.000 ölü (tartışmalı)", side: "west" },
      { label: "BM İnsan Hakları: endişe kararı", side: "un" }
    ],
    desc: "Ekonomik kriz, riyalin çöküşü. 1979'dan bu yana en büyük ayaklanma. İran hükümeti şiddetle bastırdı, internet kesti. 26.541 kişi gözaltı.",
    ir_claim: "Devlet: '3.117 ölü, meşru güvenlik operasyonu'",
    west_claim: "Trump/HRANA: 32.000'e kadar ölü, uluslararası kınama",
    casualties_ir: "3.117 (İran hükümeti) – 32.000 (Batı tahmin)",
  },
  {
    id: 2, date: "6–26 Şub 2026", day: -22, phase: "prelude",
    actor: "diplomacy", type: "talks",
    title: "Cenevre Nükleer Müzakereleri (3 Tur)",
    location: "Cenevre, İsviçre", lat: 46.2044, lng: 6.1432,
    munition: "—",
    sources: [
      { label: "Umman Dışişleri: '26 Şubat'ta önemli ilerleme'", side: "neutral" },
      { label: "İran Dışişleri (Araghchi): 'tarihi anlaşma çok yakın'", side: "iran_gov" },
      { label: "ABD (Witkoff): İran sıfır zenginleştirmeyi reddetti", side: "west" }
    ],
    desc: "Umman arabuluculuğunda 3 tur müzakere. İran: zenginleştirme hakkı 'dokunulmaz'. ABD: sıfır zenginleştirme şart. Anlaşma 2 Mart için planlandı ama savaş patlak verdi.",
    ir_claim: "Araghchi: 'Biz iyi niyetle masadaydık, ABD anlaşmayı torpilledi'",
    west_claim: "ABD: İran 460 kg %60 zenginleştirilmiş uranyumu koz olarak kullandı",
    casualties_ir: "—",
  },

  // ═══════════════════════════════════════════════════
  // GÜN 1 – 28 ŞUBAT 2026
  // ═══════════════════════════════════════════════════
  {
    id: 3, date: "28 Şub – Saat 20:38 UTC", day: 1, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "OP. EPİC FURY / ROARING LION – Liderlik Binası",
    location: "Tahran – Liderlik Evi (Leadership House)", lat: 35.7448, lng: 51.5120,
    munition: "B-2 Spirit stealth bombacı / GBU-57 MOP (13.600 kg) / BGM-109 Tomahawk",
    sources: [
      { label: "CENTCOM: '12 saatte ~900 saldırı'", side: "west" },
      { label: "İran Kızılayı: 'Liderlik binası ve çevresi yerle bir'", side: "iran_gov" },
      { label: "Britannica: 'Hamaney ve düzinelerce yetkili hayatını kaybetti'", side: "neutral" },
      { label: "Fars Ajansı (IRGC): '1 Mart sabahı Hamaney şehit oldu'", side: "iran_gov" }
    ],
    desc: "Operasyon başladı. Hamaney, kızı, damadı ve torunu öldürüldü. İran 40 günlük yas ilan etti.",
    ir_claim: "İran: 'Egemenliğimize ve BM Şartı'na açık saldırı, meşru müdafaa hakkımızı kullanacağız'",
    west_claim: "ABD/İsrail: 'Nükleer tehdidi yok etmek ve rejim değişikliği için zorunlu operasyon'",
    casualties_ir: "Hamaney + ailesi + 40+ yetkili (ABD/İsrail) | Çok sayıda sivil (İran iddiası)",
  },
  {
    id: 4, date: "28 Şub 2026", day: 1, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Natanz Nükleer Zenginleştirme Tesisi",
    location: "Natanz, İsfahan ili", lat: 33.7233, lng: 51.7272,
    munition: "GBU-57 MOP x birden fazla (yeraltı derinleştirici)",
    sources: [
      { label: "IAEA: 'Giriş binaları hasarlı, radyolojik tehlike yok'", side: "un" },
      { label: "Vantor uydu görüntüleri: hasar doğrulandı (1–2 Mar)", side: "neutral" },
      { label: "CIA (Ratcliffe): 'Yeniden inşası yıllar alır' (ertesi gün)", side: "west" },
      { label: "İran Atom Enerjisi: 'Yeraltı tesisler sağlam' (iddia)", side: "iran_gov" }
    ],
    desc: "Dünya'nın en derin korumalı nükleer tesislerinden biri. Yerüstü binaları tahrip edildi.",
    ir_claim: "İran: 'Ana zenginleştirme kademeleri zarar görmedi'",
    west_claim: "CIA: 'Büyük hasar, nükleer program yıllarca geriye atıldı'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 5, date: "28 Şub 2026", day: 1, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "MİNAB KIZ OKULU FACİASI ⚠️",
    location: "Minab, Hormozgan ili", lat: 27.1506, lng: 57.0818,
    munition: "Tanımlanamadı (deniz üssüne bitişik okul vuruldu)",
    sources: [
      { label: "İran Kızılayı: '555 sivil ölü' (ilk 2 gün özeti)", side: "iran_gov" },
      { label: "Britannica: '~170 öğrenci ölü, deniz üssü yakını'", side: "neutral" },
      { label: "Simple Wikipedia / ABC: '201 öğrenci ölü, 747 yaralı'", side: "neutral" },
      { label: "BM İnsan Hakları: 'Olası savaş suçu' incelemesi başlatıldı", side: "un" },
      { label: "ABD/İsrail: Resmi yorum yok", side: "west" }
    ],
    desc: "Deniz üssüne bitişik kız ilkokulu vuruldu. En tartışmalı olay. Ölü sayısı kaynaklar arasında çelişkili.",
    ir_claim: "İran: 'Kasıtlı sivil katliam, uluslararası hukuk ihlali'",
    west_claim: "ABD/İsrail: Resmi açıklama yok (hedef muhtemelen bitişik deniz üssü)",
    casualties_ir: "170–201 çocuk ölü, 747 yaralı",
  },
  {
    id: 6, date: "28 Şub – 1 Mar 2026", day: 1, phase: "war",
    actor: "iran", type: "retaliation",
    title: "OP. TRUE PROMISE IV – İran Büyük Misilleme",
    location: "İsrail + Körfez'deki ABD Üsleri", lat: 32.0853, lng: 34.7818,
    munition: "Shahab-3 MRBM / Emad IRBM / Qadr IRBM / Fattah-1 hipersonik / Shahed-136 İHA / Shahed-238 jet-İHA",
    sources: [
      { label: "IRGC açıklaması: '500+ balistik + ~2000 İHA fırlatıldı'", side: "iran_gov" },
      { label: "Fars Ajansı: '%40 İsrail'e, %60 Körfez'deki ABD'ye'", side: "iran_gov" },
      { label: "CENTCOM: 'Saldırıların büyük çoğunluğu engellendi'", side: "west" },
      { label: "Savunma Bak. Hegseth (14. Gün): 'Füze kapasitesi %90 düştü'", side: "west" }
    ],
    desc: "İran'ın 4. büyük misilleme operasyonu. İlk saatlerde İsrail + 27 Körfez üssü hedeflendi.",
    ir_claim: "IRGC: 'Hedeflerin önemli kısmına isabet sağlandı, USS Abraham Lincoln vuruldu (CENTCOM reddetti)'",
    west_claim: "CENTCOM: 'Uçak gemisi vurulmadı, tamamen operasyonel'",
    casualties_ir: "İsrail: ilk gün 14+ sivil yaralı | Körfez: 4 ABD askeri (Kuveyt)",
  },
  {
    id: 7, date: "28 Şub 2026", day: 1, phase: "war",
    actor: "iran", type: "retaliation",
    title: "Kuveyt ABD Üssü – İlk ABD Şehitleri",
    location: "Kuveyt", lat: 29.3117, lng: 47.4818,
    munition: "Shahed-136 kamikaze İHA",
    sources: [
      { label: "ABD Savunma Bakanlığı: 4 isim doğrulandı", side: "west" },
      { label: "ABC/CBS/Reuters: Capt. Khork, Sgt. Tietjens, Sgt. Amor, Spc. Coady", side: "west" },
      { label: "IRGC: 'ABD askeri kışlası meşru hedef'", side: "iran_gov" }
    ],
    desc: "Savaşın ilk ABD askeri şehitleri. 4 asker İHA saldırısında hayatını kaybetti.",
    ir_claim: "IRGC: 'ABD üsleri meşru askeri hedef, operasyon başarılı'",
    west_claim: "ABD: Geri adım atmayacağız, operasyon devam edecek",
    casualties_ir: "4 ABD askeri ölü (Capt. Khork, Sgt. Tietjens, Sgt. Amor, Spc. Coady)",
  },

  // ═══════════════════════════════════════════════════
  // GÜN 2–3
  // ═══════════════════════════════════════════════════
  {
    id: 8, date: "1 Mar 2026", day: 2, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Tahran – IRGC Malek-Ashtar Kompleksi",
    location: "Tahran – Lavizan bölgesi", lat: 35.7680, lng: 51.5050,
    munition: "AGM-154 JSOW / Popeye Turbo (İsrail)",
    sources: [
      { label: "Iran International uydu + video: 'Bina tamamen yıkıldı'", side: "neutral" },
      { label: "İran Savunma Bakanlığı: 'Saldırı doğrulandı, kayıplar var'", side: "iran_gov" },
      { label: "IDF: 'IRGC silah Ar-Ge merkezi imha edildi'", side: "west" }
    ],
    desc: "IRGC'nin savunma araştırma ve üretim kompleksi. Balistik füze geliştirme bağlantısı vardı.",
    ir_claim: "İran: 'Savunma altyapısına saldırı, uluslararası hukuk ihlali'",
    west_claim: "İsrail: 'Kritik IRGC Ar-Ge merkezi hedef alındı ve tahrip edildi'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 9, date: "1 Mar 2026", day: 2, phase: "war",
    actor: "iran", type: "retaliation",
    title: "Dubai Havalimanı Saldırısı",
    location: "Dubai Uluslararası Havalimanı, BAE", lat: 25.2532, lng: 55.3657,
    munition: "Shahed-129 / Shahed-238 İHA",
    sources: [
      { label: "Dubai Media Office: 'Saldırı doğrulandı, geçici kapatma'", side: "neutral" },
      { label: "IRGC: 'ABD varlığına ev sahipliği yapan BAE meşru hedef'", side: "iran_gov" },
      { label: "BAE Dışişleri: 'Alçakça ve kışkırtıcı saldırı'", side: "neutral" }
    ],
    desc: "Dünyanın en yoğun havalimanlarından biri geçici kapatıldı. Bazı oteller de vuruldu.",
    ir_claim: "IRGC: 'ABD üslerine ev sahipliği yapan BAE'ye uyarı'",
    west_claim: "BAE: 'Sivil altyapıya saldırı, kınıyoruz'",
    casualties_ir: "Yaralılar, maddi hasar",
  },
  {
    id: 10, date: "1 Mar 2026", day: 2, phase: "war",
    actor: "iran", type: "retaliation",
    title: "Beit Shemesh Rezidans Füze Saldırısı – İsrail",
    location: "Beit Shemesh, İsrail", lat: 31.7532, lng: 34.9922,
    munition: "Emad IRBM (küme bombası / cluster warhead – yasaklı)",
    sources: [
      { label: "İsrail IDF: '9 sivil ölü, sinagog sığınağı vuruldu'", side: "west" },
      { label: "Uluslararası Af Örgütü: 'Küme bombası kullanımı açık insancıl hukuk ihlali'", side: "un" },
      { label: "IRGC: 'İsrail askeri tesislerini hedef aldık'", side: "iran_gov" },
      { label: "IDF: 'Sirenlerde gecikme yaşandı, soruşturma başlatıldı'", side: "west" }
    ],
    desc: "Savaşın en ölümcül İran saldırısı İsrail'de. Sinagog sığınağı vuruldu. Küme bombası kullanıldı.",
    ir_claim: "IRGC: 'Askeri hedefleri vurduk, sivil kayıp iddialarını reddediyoruz'",
    west_claim: "İsrail: '9 sivil ölü, küme bombası kullanımı savaş suçu'",
    casualties_ir: "9 İsrailli sivil ölü, 20+ yaralı",
  },
  {
    id: 11, date: "2 Mar 2026", day: 3, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Tahran – IRIB Devlet Yayıncısı (Jam-e-Jam)",
    location: "Tahran – Jam-e-Jam Kompleksi", lat: 35.7603, lng: 51.4165,
    munition: "SPICE-2000 güdümlü bomba (İsrail)",
    sources: [
      { label: "İran Devlet Medyası: 'Bina kısmen vuruldu, kayıp yok'", side: "iran_gov" },
      { label: "BBC Verify: 'Hasar doğrulandı'", side: "neutral" },
      { label: "İsrail: 'Propaganda altyapısı hedef alındı'", side: "west" },
      { label: "RSF (Gazetecileri Koruma): 'Medya kuruluşuna saldırı endişe verici'", side: "un" }
    ],
    desc: "İran devlet yayıncısının merkezi vuruldu. İlk saatlerde yayın kesildi.",
    ir_claim: "İran: 'Sivil medya altyapısına saldırı, açık savaş suçu'",
    west_claim: "İsrail: 'Rejim propagandasını durdurmak için meşru hedef'",
    casualties_ir: "Resmi kayıp yok (İran açıklaması)",
  },
  {
    id: 12, date: "2 Mar 2026", day: 3, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Arg Meydanı – Gülistan Sarayı Yakını",
    location: "Tahran – Arg Meydanı", lat: 35.6793, lng: 51.4196,
    munition: "Tanımlanamadı",
    sources: [
      { label: "UNESCO: 'Tarihi Gülistan Sarayı kompleksi hasar gördü' – endişe bildirisi", side: "un" },
      { label: "İran Miras Örgütü: 'UNESCO Dünya Mirası alanı zarar gördü'", side: "iran_gov" },
      { label: "İsrail/ABD: Resmi yorum yok", side: "west" }
    ],
    desc: "UNESCO Dünya Mirası alanı yakınında patlama. 19. yy. Kaçar dönemi sarayı zarar gördü.",
    ir_claim: "İran: 'Kültürel miras kasıtlı hedef alındı'",
    west_claim: "ABD/İsrail: Resmi açıklama yok",
    casualties_ir: "Maddi hasar",
  },
  {
    id: 13, date: "3 Mar 2026", day: 4, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Tahran – Uzmanlar Meclisi Binası",
    location: "Tahran – Uzmanlar Meclisi", lat: 35.6996, lng: 51.3359,
    munition: "Delilah cruise missile (İsrail)",
    sources: [
      { label: "IDF: '8 Mart'taki yeni lider seçimini geciktirdik'", side: "west" },
      { label: "İran Resmi Medyası: 'Toplantı öncesi bina bombalandı'", side: "iran_gov" },
      { label: "Wikipedia: '84 üyeli meclis ön toplantı sırasında vuruldu'", side: "neutral" }
    ],
    desc: "Yeni dini lider seçmek için toplanmayı bekleyen meclis vuruldu. Seçim 8 Mart'a ertelendi.",
    ir_claim: "İran: 'Siyasi kurumlarımıza saldırı'",
    west_claim: "İsrail: 'Rejim liderlik yapısını çözme operasyonu'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 14, date: "5 Mar 2026", day: 6, phase: "war",
    actor: "us", type: "naval",
    title: "IRIS Dena Fırkateyni Sri Lanka Açıklarında Batırıldı",
    location: "Sri Lanka – Galle açıkları (Hint Okyanusu)", lat: 6.0535, lng: 80.2210,
    munition: "MK-48 ADCAP torpedo (ABD denizaltısı)",
    sources: [
      { label: "Savunma Bak. Hegseth: ABD denizaltısı saldırısını doğruladı", side: "west" },
      { label: "Sri Lanka Donanması: '87 ceset, 32 kurtarıldı'", side: "neutral" },
      { label: "İran Donanması: 'Gemi Hindistan Deniz Tatbikatı'ndan dönüyordu'", side: "iran_gov" },
      { label: "IRGC: 'Bu saldırı intikamı gerektirir'", side: "iran_gov" }
    ],
    desc: "İran fırkateyni IRIS Dena, Visakhapatnam tatbikatından dönerken batırıldı. Savaş alanı okyanusa genişledi.",
    ir_claim: "İran: 'Uluslararası sularda katliama varan saldırı'",
    west_claim: "ABD: 'İran deniz gücü operasyon alanı dışındaki sularda da tehdit'",
    casualties_ir: "87 İran denizcisi ölü, 32 hayatta kurtarıldı",
  },
  {
    id: 15, date: "5 Mar 2026", day: 6, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Azadi Stadyumu (12.000 kişilik) – Tahran",
    location: "Tahran – Azadi Spor Kompleksi", lat: 35.7327, lng: 51.3136,
    munition: "GBU-31 JDAM",
    sources: [
      { label: "Wikipedia Timeline: 'Azadi Stadyumu tamamen yıkıldı'", side: "neutral" },
      { label: "İran Spor Bakanlığı: 'Sivil spor tesisi kasıtlı hedef alındı'", side: "iran_gov" },
      { label: "UNESCO: 'Spor ve kültür altyapısına saldırı endişe verici'", side: "un" },
      { label: "İsrail: 'Silah deposu ve IRGC toplantı noktası olarak kullanıldı'", side: "west" }
    ],
    desc: "12.000 kişilik kapalı arena. İran sivil altyapı, İsrail ise çift kullanımlı askeri depo iddiasıyla farklı yorumluyor.",
    ir_claim: "İran: 'Kasıtlı sivil yıkım kampanyası'",
    west_claim: "İsrail: 'IRGC operasyonel toplanma noktası'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 16, date: "6–7 Mar 2026", day: "7–8", phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Tahran Hafta Sonu Yoğun Bombardımanı",
    location: "Tahran – Mehrabad + Yakıt Depoları", lat: 35.6892, lng: 51.3130,
    munition: "F-35I Adir + F-15I Ra'am / GBU-28 / MPR-500 (İsrail) + B-52 / GBU-31 (ABD)",
    sources: [
      { label: "Alma Araştırma: '400 hedef, 1465 mühimmat 2 günde'", side: "west" },
      { label: "IDF: '80 F-15/F-35 + 230 mühimmat sadece Tahran'a'", side: "west" },
      { label: "IDF: 'Mehrabad'da 16 Kudüs Kuvvetleri nakliye uçağı imha'", side: "west" },
      { label: "İran Kızılayı: 'Sivil yakıt altyapısı ve mahalle depoları vuruldu'", side: "iran_gov" }
    ],
    desc: "Şahr Rey, Shahran, Nobonyad yakıt depoları ve askeri rafineriler vuruldu. IRGC üniversitesi tahrip edildi.",
    ir_claim: "İran Kızılayı: 'Sivil enerji altyapısı kasıtlı hedef, 3.2 milyon yerinden edildi'",
    west_claim: "IDF: 'Rejim altyapısı ve savaş kapasitesi hedef alındı'",
    casualties_ir: "3.2 milyon yerinden edildi (BM BMMYK)",
  },
  {
    id: 17, date: "7 Mar 2026", day: 8, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "İsfahan – 8. Taktik Hava Üssü (F-14 İmhası)",
    location: "İsfahan – Taktik Hava Üssü No.8", lat: 32.7513, lng: 51.8610,
    munition: "AGM-154C JSOW / Popeye Turbo (İsrail)",
    sources: [
      { label: "IDF: 'İsfahan'da F-14 Tomcat'lar imha edildi'", side: "west" },
      { label: "Alma/Uydu (8 Mar): 'Üste 12+ mühimmat hasarı doğrulandı'", side: "neutral" },
      { label: "CTP-ISW: '17 taktik üssün 10'u, 6 kara kuvvetleri üssünün 3'ü vuruldu'", side: "west" },
      { label: "İran Hava Kuvvetleri: resmi açıklama yok", side: "iran_gov" }
    ],
    desc: "İran'ın son F-14 Tomcat filosu kısmen imha edildi. ABD'nin 1979 öncesi sattığı uçaklar.",
    ir_claim: "İran resmi: Sessizlik",
    west_claim: "IDF: 'İran hava gücü pratik olarak etkisizleştirildi'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 18, date: "8 Mar 2026", day: 9, phase: "war",
    actor: "iran_internal", type: "political",
    title: "Mojtaba Hamaney Yeni Dini Lider Seçildi",
    location: "Tahran", lat: 35.6892, lng: 51.3890,
    munition: "—",
    sources: [
      { label: "İran Devlet Medyası (IRNA): Seçim resmi açıklandı", side: "iran_gov" },
      { label: "IRGC: 'Bağlılık yemini edildi'", side: "iran_gov" },
      { label: "ABD Savunma Bak.: 'Hamaney yaralı ve muhtemelen şekli bozulmuş'", side: "west" },
      { label: "ABD: 10 milyon dolar ödül açıklandı", side: "west" }
    ],
    desc: "56 yaşında Mojtaba Hamaney (öldürülen liderin oğlu) yeni dini lider olarak seçildi. İlk açıklamasında savaşın süreceğini duyurdu.",
    ir_claim: "Mojtaba Hamaney: 'ABD üsleri bölgeden çekilene kadar saldırılar durmayacak'",
    west_claim: "Hegseth: 'Yeni lider yaralı, korkmuş ve çaresiz'",
    casualties_ir: "—",
  },
  {
    id: 19, date: "9 Mar 2026", day: 10, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "İsfahan – Naqsh-e Jahan Meydanı Çevresi ⚠️",
    location: "İsfahan – Naqsh-e Jahan Meydanı", lat: 32.6574, lng: 51.6772,
    munition: "Tanımlanamadı",
    sources: [
      { label: "Wikipedia: 'Naqsh-e Jahan, Çehel Sotun, Ali Qapu, Şah Camii hasar gördü'", side: "neutral" },
      { label: "İran Miras Bakanlığı: 'UNESCO Mirası 6 alan zarar gördü'", side: "iran_gov" },
      { label: "UNESCO (11 Mar): 'Miras alanlarının korunması için çağrı yaptı'", side: "un" },
      { label: "ABD/İsrail: Resmi açıklama yok", side: "west" }
    ],
    desc: "Dünya'nın en büyük meydanlarından biri ve çevre tarihi yapılar hasar gördü. UNESCO acil açıklama yaptı.",
    ir_claim: "İran: 'Kültürel soykırım, tüm medeniyet miras alanları kasıtlı hedef'",
    west_claim: "ABD/İsrail: Resmi açıklama yok",
    casualties_ir: "Maddi / kültürel hasar",
  },
  {
    id: 20, date: "9 Mar 2026", day: 10, phase: "war",
    actor: "iran", type: "retaliation",
    title: "Bahreyn – Millennium Tower (Manama)",
    location: "Manama, Bahreyn – Al-Seef bölgesi", lat: 26.2235, lng: 50.5876,
    munition: "Shahed-136 İHA",
    sources: [
      { label: "Alma Araştırma: '1 ölü, 8 yaralı, iş merkezi vuruldu'", side: "neutral" },
      { label: "Bahreyn Savunma Bakanlığı: 'Saldırı doğrulandı'", side: "neutral" },
      { label: "IRGC: 'Körfez'deki ABD müttefiki altyapısı meşru hedef'", side: "iran_gov" }
    ],
    desc: "Manama'nın iş merkezinde sivil kule vuruldu.",
    ir_claim: "IRGC: 'ABD varlığına ev sahipliği yapan ülkeler meşru hedef'",
    west_claim: "Bahreyn: 'Sivil altyapıya alçakça saldırı'",
    casualties_ir: "1 ölü, 8 yaralı",
  },
  {
    id: 21, date: "9 Mar 2026", day: 10, phase: "war",
    actor: "us", type: "airstrike",
    title: "Bandar Abbas Limanı – 2. Şahid Soleimani Korvetinin İmhası",
    location: "Bandar Abbas, Hormozgan", lat: 27.1865, lng: 56.2808,
    munition: "AGM-84 Harpoon / AGM-158C LRASM",
    sources: [
      { label: "Alma Araştırma: '2. Soleimani sınıfı korvet Bandar Abbas'ta imha'", side: "west" },
      { label: "CENTCOM: '60 İran deniz gemisi 15 günde batırıldı'", side: "west" },
      { label: "İran Deniz Kuvvetleri: resmi kayıp açıklaması yok", side: "iran_gov" }
    ],
    desc: "IRGC'nin amiral gemisi sınıfından ikinci korvet yok edildi. ABD toplamda 60 İran gemisi batırdığını açıkladı.",
    ir_claim: "İran: Resmi kayıp açıklaması yok",
    west_claim: "CENTCOM: '60 gemi batırıldı, İran deniz gücü etkisizleştirildi'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 22, date: "10 Mar 2026", day: 11, phase: "war",
    actor: "iran", type: "retaliation",
    title: "İsrail'e Küme Bombası Füze Saldırısı – Yehud",
    location: "Yehud, İsrail (Tel Aviv yakını)", lat: 32.0333, lng: 34.8833,
    munition: "Emad IRBM – küme bombası başlıklı (Cluster Munition Warhead)",
    sources: [
      { label: "IDF: '2 sivil ölü, Tel Aviv doğusunda birden fazla isabet'", side: "west" },
      { label: "Uluslararası Af Örgütü: 'Küme bombası kullanımı uluslararası hukuk ihlali'", side: "un" },
      { label: "IRGC: 'İsrail askeri altyapısını hedef aldık'", side: "iran_gov" },
      { label: "JJINS analizi: 'Küme bombası saldırıları ilk günden bu yana devam ediyor'", side: "neutral" }
    ],
    desc: "10 km yarıçaplı alan etkileniyor. 100+ ülke tarafından yasaklı silah. İran imzalamadı.",
    ir_claim: "IRGC: 'Sadece askeri hedef vuruldu'",
    west_claim: "İsrail/ABD/Uluslararası Af: 'Sivil bölgelerde yasaklı silah kullanımı'",
    casualties_ir: "2 sivil ölü, birden fazla yaralı (İsrail)",
  },
  {
    id: 23, date: "11 Mar 2026", day: 12, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Parchin – Taleqan-2 Nükleer Tesisi",
    location: "Parchin Askeri Kompleksi, Tahran yakını", lat: 35.5167, lng: 51.7667,
    munition: "GBU-57 MOP",
    sources: [
      { label: "ISIS (Nükleer Bilim ve Güvenlik): 'Uydu görüntüsü hasarı doğruladı'", side: "neutral" },
      { label: "Alma Araştırma: '11 Mar uydu görüntüsü: Taleqan-2 vuruldu'", side: "west" },
      { label: "İran Atom Enerjisi: Resmi açıklama yok", side: "iran_gov" },
      { label: "CIA: 'Nükleer program yıllarca geri atıldı'", side: "west" }
    ],
    desc: "Nükleer programın kilit unsurlarından biri. Parchin kompleksinde yüksek patlayıcı test tesisi.",
    ir_claim: "İran: Resmi açıklama yok",
    west_claim: "ABD/İsrail: 'Nükleer kapasite büyük ölçüde imha edildi'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 24, date: "11 Mar 2026", day: 12, phase: "war",
    actor: "us", type: "naval",
    title: "Hürmüz Boğazı – 16 Mayın Döşeme Gemisi İmhası",
    location: "Hürmüz Boğazı", lat: 26.5667, lng: 56.2500,
    munition: "AGM-65 Maverick / MK-82 (P-8 Poseidon uçağından)",
    sources: [
      { label: "CENTCOM video: '16 mayın döşeme gemisi imha edildi'", side: "west" },
      { label: "Euronews: 'ABD görüntülerini kamuoyuyla paylaştı'", side: "neutral" },
      { label: "IRGC: '2 gemimiz uyarıları dinlemeyen Batı gemilerine ateş açtı'", side: "iran_gov" },
      { label: "İngiltere Deniz Ticaret: '16+ gemi saldırıya uğradı'", side: "neutral" }
    ],
    desc: "İran boğaza mayın döşemeye çalıştı, ABD önce gemileri vurdu. 2 İran gemisi ticaret gemilerini durdurdu.",
    ir_claim: "IRGC: 'Uyarıları görmezden gelen gemilere standart prosedür uygulandı'",
    west_claim: "ABD: 'Mayın döşeme girişimi engellendi, boğaz güvenlik operasyonu'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 25, date: "12 Mar 2026", day: 13, phase: "war",
    actor: "iran", type: "retaliation",
    title: "Suudi Arabistan – Ras Tanura Rafinerisi Saldırısı",
    location: "Ras Tanura, Suudi Arabistan", lat: 26.6395, lng: 50.1588,
    munition: "Shahed-129 / Quds-1 cruise missile",
    sources: [
      { label: "Al Jazeera uydu: 'Ras Tanura rafinerisinde yangın görüntülendi'", side: "neutral" },
      { label: "Suudi Savunma Bakanlığı: 'Saldırılar engellendi'", side: "neutral" },
      { label: "IRGC: 'Ekonomik baskı için Körfez enerji altyapısı hedef'", side: "iran_gov" },
      { label: "Aramco: Resmi açıklama yok", side: "neutral" }
    ],
    desc: "Dünya'nın en büyük petrol rafinerilerinden biri hedef alındı. Petrol fiyatları %47 tırmandı.",
    ir_claim: "IRGC: 'ABD-İsrail saldırısının ekonomik maliyetini bölgeye yayma stratejisi'",
    west_claim: "Suudi Arabistan: 'Bölge istikrarına ve ekonomiye saldırı'",
    casualties_ir: "Maddi hasar",
  },
  {
    id: 26, date: "13 Mar 2026", day: 14, phase: "war",
    actor: "us_israel", type: "airstrike",
    title: "Tahran – Hedefli Lider Suikastı Girişimi",
    location: "Tahran – Al-Quds Günü Mitingi yakını", lat: 35.6892, lng: 51.3890,
    munition: "Popeye Turbo / Delilah",
    sources: [
      { label: "Al Jazeera: 'Miting yakınında patlama, 1 ölü'", side: "neutral" },
      { label: "İran Devlet Medyası: 'Larijani, Pezeshkian, Araghchi yara almadı'", side: "iran_gov" },
      { label: "Hegseth: 'Yeni lider yaralı ve muhtemelen şekli bozulmuş'", side: "west" },
      { label: "İran Cumhurbaşkanlığı: 'Liderler güvende'", side: "iran_gov" }
    ],
    desc: "Üst düzey İran yetkililerinin katıldığı Kudüs Günü mitingine yakın patlama.",
    ir_claim: "İran: 'Suikast girişimi, korkaklık'",
    west_claim: "ABD/İsrail: Resmi yorum yok",
    casualties_ir: "1 ölü, yaralılar",
  },
  {
    id: 27, date: "13 Mar 2026", day: 14, phase: "war",
    actor: "us", type: "airstrike",
    title: "KHARG ADASI – 'Taç Mücevher' Operasyonu",
    location: "Kharg Adası, Körfez", lat: 29.2600, lng: 50.3200,
    munition: "B-2 Spirit / GBU-57 MOP / AGM-158B JASSM-ER",
    sources: [
      { label: "Trump (Truth Social + basın): 'Tüm askeri hedefler tamamen imha edildi'", side: "west" },
      { label: "CNN: 'İran petrol ihracatının %90'ı bu adadan'", side: "neutral" },
      { label: "İran Dışişleri (Araghchi): 'Petrol tesislerimiz vurulursa Amerikan şirketlerini bölgede hedef alırız'", side: "iran_gov" },
      { label: "IRGC: 'BAE'deki ABD varlıkları, limanlar meşru hedef'", side: "iran_gov" }
    ],
    desc: "İran'ın ham petrol ihracatının %90'ı bu adadan geçiyor. İlk 2 haftada dokunulmamıştı. Büyük eskalasyon.",
    ir_claim: "İran: 'Petrol altyapısı vurulursa bölgedeki Amerikan çıkarlarına misilleme yapılacak'",
    west_claim: "Trump: 'Tamamı imha edildi. Hürmüz boğazını açın yoksa petrol tesislerini de vururum'",
    casualties_ir: "Bilinmiyor",
  },
  {
    id: 28, date: "14 Mar 2026", day: 15, phase: "war",
    actor: "iran", type: "retaliation",
    title: "BAE – Fujairah Enerji Terminali Yangını",
    location: "Fujairah, BAE", lat: 25.1221, lng: 56.3265,
    munition: "Shahed-238 jet-İHA",
    sources: [
      { label: "AFP: 'Fujairah'ta enerji terminalinde yangın, dumanlar yükseliyor'", side: "neutral" },
      { label: "Fujairah Medya Ofisi: 'Düşürülen İHA enkazından yangın çıktı'", side: "neutral" },
      { label: "IRGC: 'Kharg'a karşılık BAE enerji altyapısı vuruldu'", side: "iran_gov" },
      { label: "BAE: '9 balistik füze ve 33 İHA interceptor'larla engellendi'", side: "neutral" }
    ],
    desc: "Kharg saldırısına İran'ın misilleme yanıtı. Fujairah dünya bunkering merkezlerinden biri.",
    ir_claim: "IRGC: 'Kharg'a karşılık bölge enerji altyapısı hedeflenecek'",
    west_claim: "BAE: 'Sivil altyapıya saldırı, kınıyoruz'",
    casualties_ir: "Yaralanma yok (BAE açıklaması)",
  },
];

const PHASES = {
  prelude: { label: "Ön Süreç", color: "#6b7280" },
  war: { label: "Savaş", color: "#dc2626" },
};

const ACTORS = {
  us: { label: "ABD", color: "#1d4ed8", flag: "🇺🇸" },
  us_israel: { label: "ABD + İsrail", color: "#7c3aed", flag: "🇺🇸🇮🇱" },
  iran: { label: "İran", color: "#b45309", flag: "🇮🇷" },
  iran_internal: { label: "İran (iç)", color: "#92400e", flag: "🇮🇷" },
  diplomacy: { label: "Diplomasi", color: "#047857", flag: "🕊️" },
};

const SOURCE_COLORS = {
  iran_gov: { bg: "#7f1d1d", border: "#ef4444", label: "İran Resmi" },
  iran_opp: { bg: "#78350f", border: "#f97316", label: "İran Muhalefet" },
  west: { bg: "#1e3a5f", border: "#3b82f6", label: "ABD/İsrail" },
  un: { bg: "#064e3b", border: "#10b981", label: "BM/Uluslararası" },
  neutral: { bg: "#1e1b4b", border: "#8b5cf6", label: "Bağımsız/Nötr" },
};

export default function WarTimeline() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return EVENTS.filter(e => {
      if (filter !== "all" && e.actor !== filter && !(filter === "iran_all" && e.actor.startsWith("iran"))) return false;
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.location.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  const ev = selected ? EVENTS.find(e => e.id === selected) : null;

  return (
    <div style={{
      background: "#09090b",
      minHeight: "100vh",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#e4e4e7",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #27272a",
        padding: "24px 32px 20px",
        background: "linear-gradient(180deg, #18181b 0%, #09090b 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
          <span style={{ fontSize: 11, letterSpacing: 4, color: "#71717a", fontFamily: "monospace", textTransform: "uppercase" }}>Kronoloji</span>
          <span style={{ fontSize: 11, color: "#3f3f46" }}>|</span>
          <span style={{ fontSize: 11, letterSpacing: 2, color: "#ef4444", fontFamily: "monospace" }}>CANLI &bull; 14 Mart 2026 &bull; G&uuml;n 15</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: "normal", margin: 0, letterSpacing: 1, color: "#fafafa" }}>
          2026 İran Savaşı &mdash; Kapsamlı Kronoloji
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#71717a", fontStyle: "italic" }}>
          Her iki tarafın resmi açıklamaları ve bağımsız kaynaklar karşılaştırmalı sunulmaktadır
        </p>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { key: "all", label: "Tümü", emoji: "🌐" },
            { key: "us_israel", label: "ABD+İsrail", emoji: "🇺🇸🇮🇱" },
            { key: "iran", label: "İran", emoji: "🇮🇷" },
            { key: "diplomacy", label: "Diplomasi", emoji: "🕊️" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "5px 12px", borderRadius: 4, border: "1px solid",
              borderColor: filter === f.key ? "#71717a" : "#27272a",
              background: filter === f.key ? "#27272a" : "transparent",
              color: filter === f.key ? "#fafafa" : "#71717a",
              cursor: "pointer", fontSize: 12, fontFamily: "monospace", letterSpacing: 1,
            }}>{f.emoji} {f.label}</button>
          ))}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ara: şehir, silah..."
            style={{
              marginLeft: "auto", padding: "5px 12px", borderRadius: 4,
              border: "1px solid #27272a", background: "#18181b",
              color: "#e4e4e7", fontSize: 12, fontFamily: "monospace", width: 180,
              outline: "none",
            }}
          />
        </div>

        {/* Source legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          {Object.entries(SOURCE_COLORS).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: v.border }} />
              <span style={{ fontSize: 10, color: "#71717a", fontFamily: "monospace" }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Timeline */}
        <div style={{
          width: ev ? "45%" : "100%",
          overflowY: "auto",
          padding: "16px 0",
          transition: "width 0.2s",
        }}>
          {filtered.map((e, i) => {
            const actor = ACTORS[e.actor] || ACTORS.us;
            const isSelected = selected === e.id;
            const isPrelude = e.phase === "prelude";
            return (
              <div key={e.id} onClick={() => setSelected(isSelected ? null : e.id)}
                style={{
                  display: "flex", gap: 0, cursor: "pointer",
                  opacity: isPrelude ? 0.75 : 1,
                }}>
                {/* Date column */}
                <div style={{
                  width: 130, minWidth: 130, padding: "12px 12px 12px 24px",
                  textAlign: "right",
                }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#52525b", lineHeight: 1.3 }}>
                    {e.date}
                  </div>
                  {!isPrelude && (
                    <div style={{ fontSize: 9, color: "#3f3f46", fontFamily: "monospace", marginTop: 2 }}>
                      GÜN {e.day}
                    </div>
                  )}
                </div>

                {/* Line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
                  <div style={{
                    width: 2,
                    height: 16,
                    background: i === 0 ? "transparent" : "#27272a",
                  }} />
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: isSelected ? actor.color : "#27272a",
                    border: `2px solid ${actor.color}`,
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 10px ${actor.color}` : "none",
                    transition: "all 0.15s",
                  }} />
                  <div style={{
                    width: 2,
                    flex: 1,
                    minHeight: 16,
                    background: "#27272a",
                  }} />
                </div>

                {/* Content */}
                <div style={{
                  flex: 1, padding: "10px 24px 10px 12px",
                  background: isSelected ? "#18181b" : "transparent",
                  borderLeft: isSelected ? `2px solid ${actor.color}` : "2px solid transparent",
                  transition: "all 0.15s",
                  marginBottom: 2,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 2,
                      background: actor.color + "22",
                      border: `1px solid ${actor.color}44`,
                      color: actor.color, fontFamily: "monospace", letterSpacing: 1,
                    }}>{actor.flag} {actor.label}</span>
                    <span style={{
                      fontSize: 9, color: "#52525b", fontFamily: "monospace",
                      padding: "1px 6px", border: "1px solid #27272a", borderRadius: 2,
                    }}>{e.type === "airstrike" ? "✈ HAVA" : e.type === "retaliation" ? "🚀 MİSİLLEME" : e.type === "naval" ? "⚓ DENİZ" : e.type === "talks" ? "🤝 DİPLOMASİ" : e.type === "buildup" ? "⚙ YIĞINAK" : e.type === "political" ? "🏛 SİYASİ" : "📌"}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#e4e4e7", marginBottom: 3, lineHeight: 1.4 }}>
                    {e.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#71717a", fontFamily: "monospace" }}>
                    📍 {e.location}
                  </div>
                  {!ev && (
                    <div style={{ fontSize: 11, color: "#52525b", marginTop: 4, lineHeight: 1.4 }}>
                      {e.desc.substring(0, 90)}…
                    </div>
                  )}
                  {/* Source chips preview */}
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {e.sources.slice(0, 3).map((s, si) => (
                      <span key={si} style={{
                        fontSize: 9, padding: "1px 5px", borderRadius: 2,
                        background: SOURCE_COLORS[s.side]?.bg || "#1f1f23",
                        border: `1px solid ${SOURCE_COLORS[s.side]?.border || "#3f3f46"}`,
                        color: SOURCE_COLORS[s.side]?.border || "#71717a",
                        fontFamily: "monospace",
                      }}>{SOURCE_COLORS[s.side]?.label}</span>
                    ))}
                    {e.sources.length > 3 && (
                      <span style={{ fontSize: 9, color: "#52525b", fontFamily: "monospace" }}>+{e.sources.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ height: 40 }} />
        </div>

        {/* Detail panel */}
        {ev && (
          <div style={{
            width: "55%",
            borderLeft: "1px solid #27272a",
            overflowY: "auto",
            padding: "24px",
            background: "#0c0c0e",
          }}>
            <button onClick={() => setSelected(null)} style={{
              background: "none", border: "1px solid #27272a", color: "#71717a",
              cursor: "pointer", padding: "4px 10px", borderRadius: 3,
              fontSize: 11, fontFamily: "monospace", marginBottom: 20,
            }}>✕ KAPAT</button>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 3,
                background: (ACTORS[ev.actor] || ACTORS.us).color + "22",
                border: `1px solid ${(ACTORS[ev.actor] || ACTORS.us).color}55`,
                color: (ACTORS[ev.actor] || ACTORS.us).color, fontFamily: "monospace",
              }}>{(ACTORS[ev.actor] || ACTORS.us).flag} {(ACTORS[ev.actor] || ACTORS.us).label}</span>
              <span style={{ fontSize: 10, color: "#52525b", fontFamily: "monospace", padding: "2px 8px", border: "1px solid #27272a", borderRadius: 3 }}>
                {ev.date}
              </span>
              {ev.day > 0 && (
                <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "monospace", padding: "2px 8px", border: "1px solid #27272a", borderRadius: 3 }}>
                  GÜN {ev.day}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: "normal", margin: "0 0 8px", lineHeight: 1.4, color: "#fafafa" }}>
              {ev.title}
            </h2>
            <div style={{ fontSize: 12, color: "#71717a", fontFamily: "monospace", marginBottom: 20 }}>
              📍 {ev.location}
            </div>

            {/* Map coordinates */}
            <div style={{
              background: "#18181b", border: "1px solid #27272a", borderRadius: 4,
              padding: "10px 14px", marginBottom: 20,
              display: "flex", gap: 20,
            }}>
              <div>
                <div style={{ fontSize: 9, color: "#52525b", fontFamily: "monospace", marginBottom: 2 }}>KOORDİNATLAR</div>
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#a1a1aa" }}>
                  {ev.lat}°N, {ev.lng}°E
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "#52525b", fontFamily: "monospace", marginBottom: 2 }}>SALDIRI TİPİ</div>
                <div style={{ fontSize: 12, fontFamily: "monospace", color: "#a1a1aa" }}>{ev.type?.toUpperCase()}</div>
              </div>
            </div>

            {/* Munition */}
            {ev.munition !== "—" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#52525b", fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" }}>
                  🔧 Kullanılan Mühimmat / Silah
                </div>
                <div style={{
                  background: "#18181b", border: "1px solid #3f3f46",
                  borderRadius: 4, padding: "10px 14px",
                  fontSize: 12, fontFamily: "monospace", color: "#fbbf24",
                  lineHeight: 1.6,
                }}>
                  {ev.munition}
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#52525b", fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase" }}>
                📋 Olay Özeti
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "#d4d4d8", margin: 0 }}>{ev.desc}</p>
            </div>

            {/* Casualties */}
            {ev.casualties_ir && ev.casualties_ir !== "—" && (
              <div style={{
                background: "#1c0a0a", border: "1px solid #7f1d1d",
                borderRadius: 4, padding: "10px 14px", marginBottom: 20,
              }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#ef4444", fontFamily: "monospace", marginBottom: 6 }}>
                  💀 KAYIPLAR
                </div>
                <div style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>{ev.casualties_ir}</div>
              </div>
            )}

            {/* Two-sided claims */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#52525b", fontFamily: "monospace", marginBottom: 10, textTransform: "uppercase" }}>
                ⚖️ Taraf İddiaları (Karşılaştırmalı)
              </div>
              <div style={{
                background: "#1a0808", border: "1px solid #7f1d1d",
                borderRadius: 4, padding: "12px 14px", marginBottom: 8,
              }}>
                <div style={{ fontSize: 9, color: "#ef4444", fontFamily: "monospace", marginBottom: 5 }}>🇮🇷 İRAN / IRGC AÇIKLAMASI</div>
                <div style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>{ev.ir_claim}</div>
              </div>
              <div style={{
                background: "#07111d", border: "1px solid #1d4ed8",
                borderRadius: 4, padding: "12px 14px",
              }}>
                <div style={{ fontSize: 9, color: "#3b82f6", fontFamily: "monospace", marginBottom: 5 }}>🇺🇸🇮🇱 ABD / İSRAİL AÇIKLAMASI</div>
                <div style={{ fontSize: 12, color: "#93c5fd", lineHeight: 1.5 }}>{ev.west_claim}</div>
              </div>
            </div>

            {/* Sources */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#52525b", fontFamily: "monospace", marginBottom: 10, textTransform: "uppercase" }}>
                📰 Kaynaklar ({ev.sources.length})
              </div>
              {ev.sources.map((s, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, padding: "8px 12px",
                  background: SOURCE_COLORS[s.side]?.bg || "#18181b",
                  border: `1px solid ${SOURCE_COLORS[s.side]?.border || "#27272a"}`,
                  borderRadius: 4, marginBottom: 6,
                  alignItems: "center",
                }}>
                  <span style={{
                    fontSize: 9, padding: "1px 6px", borderRadius: 2,
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${SOURCE_COLORS[s.side]?.border || "#3f3f46"}`,
                    color: SOURCE_COLORS[s.side]?.border || "#71717a",
                    fontFamily: "monospace", whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}>{SOURCE_COLORS[s.side]?.label}</span>
                  <span style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.4 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div style={{
        borderTop: "1px solid #27272a",
        padding: "10px 32px",
        background: "#09090b",
        display: "flex", gap: 24, flexWrap: "wrap",
        fontSize: 10, fontFamily: "monospace", color: "#52525b",
      }}>
        {[
          ["İran Sivil Ölü", "1.444+", "#ef4444"],
          ["İsrail'de Ölü", "15+", "#3b82f6"],
          ["ABD Askeri Şehit", "11", "#1d4ed8"],
          ["Körfez'de Ölü", "19+", "#f59e0b"],
          ["İran'da Yerinden Edilen", "3.2M", "#8b5cf6"],
          ["ABD/İsrail Saldırısı", "5.500+", "#7c3aed"],
          ["İran Füze/İHA", "500+/2000+", "#dc2626"],
          ["Batırılan İran Gemisi", "60", "#0891b2"],
          ["Petrol Fiyatı Artışı", "+47%", "#f97316"],
        ].map(([k, v, c]) => (
          <div key={k}>
            <span style={{ color: "#3f3f46" }}>{k}: </span>
            <span style={{ color: c }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
