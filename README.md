# Oyun Adası

1920 × 1080 (16:9) sahne olarak hazırlanmıştır. Ekran oranı değiştiğinde sahne kırpılmadan ölçeklenir; kalan alanlar siyah olur. Üst menü, karşılama metni ve seçim kartları yoktur. Girişte yalnızca görsel/video görünür; ada seçimi doğrudan görseldeki tabelalara tıklanarak yapılır.

## Çalıştırma

`index.html` dosyasını tarayıcıda açın veya bu klasörde `python -m http.server 5500` çalıştırıp `http://localhost:5500` adresine gidin.

## Videolar

- `videos/secim.mp4` — hazır giriş videosu. “Başla” düğmesine basıldığında sesli oynar ve düğme kaybolur. Görünmez tabela alanları yalnızca video bittiğinde seçilebilir olur. Son kare ekranda kalır. Ada seçimine geri dönüldüğünde video yeniden oynar; seçim alanları yine bitişe kadar kilitlenir.
- `videos/kelebekler.mp4` — Kelebekler Adası videosu.
- `videos/cicekvadi.mp4` — Çiçek Adası videosu.
- `videos/kelebekmini.mp4` — Kelebekler Adası için küçük modda döngüye giren ayrı video.
- `videos/cicekmini.mp4` — Çiçek Adası için küçük modda döngüye giren ayrı video.

Giriş ve iki ada videosu eklenmiştir. Açılışta giriş görseli ve “Başla” düğmesi görünür. Giriş videosu düğmeye basılana kadar oynamaz. Ada seçilince mevcut kare, ada videosu hazırlanıp oynayana kadar korunur. Girişin son karesi ada videolarının ilk karesiyle eşleştiği için kararma veya ekstra efekt olmadan doğrudan geçilir. Videoların kendi geçiş animasyonları kullanılır. Ada videosu yüklenemediğinde ilgili görsel kullanılır. Yapay tarayıcı seslendirmesi kullanılmaz.

Ada videosu önce bir kez tam ekranda sesli oynar. Bittiğinde sahne 450 ms boyunca kararır. Mini video ve yazı ekranına geçiş tamamen karanlıkta yapılır; yeni ekran 650 ms boyunca aydınlanır. Küçük moda ait ayrı kare video sol üstte sessiz döngüde oynar. Ayrı video henüz eklenmemişse mevcut ada videosu döngüde devam eder. Sağ tarafta `bosyazialani.png` üzerindeki parşömen yazı alanı açılır. “Kaydet” taslağı tarayıcıda saklar ve yalnızca parşömen, başlık ve hikâyeden oluşan yüksek kaliteli `.jpg` dosyası indirir. Uzun hikâyelerde parşömen uzatılarak tüm metin kaydedilir. “Yazdır” sadece başlık, ada adı ve hikâye metni için tarayıcının yazdırma penceresini açar. Sağ üstteki “Ana sayfa” tüm ekranlardan videoları durdurarak “Başla” ekranına döner ve yazılan hikâyeyi saklar. Sol alttaki ok seçilen adayı yeniden tam ekran oynatır.

Yazı ekranındaki mini video alanı 1:1 kare oranındadır. Video `object-fit: contain` ile kırpılmadan ve esnetilmeden gösterilir. Solda ahşap kenarlı kare video, sağda parşömen; parşömenin altında Kaydet ve Yazdır bulunur.

Tabeladaki “Çiçek Vadisi” yazısı görselin parçasıdır. Uygulamadaki ada adı “Çiçek Adası”dır. Farklı video yolları için `app.js` başındaki sabitleri değiştirin.


## Sayfa görselleri

Açılış düğmesi kullanıcının hazırladığı `images/baslabuton.png` dosyasını kullanır. Yazı ekranı, verilen tasarım referansına göre imagegen yerleşik aracıyla üretilen `images/yazi-sahnesi.png` arka planına gerçek video, yazı alanları ve düğmeleri yerleştirir. Üretim promptu `images/yazi-sahnesi-prompt.txt` dosyasındadır. Mini videonun kare oranı korunur; ahşap çerçevenin içinde esnetilmeden oynatılır. JPG kaydı bu arka plandaki parşömeni ve girilen hikâyeyi içerir.
