#!/usr/bin/env python3
"""Rewrite placename scripts + generate matching neural audio (HsiaoChen)."""

from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src" / "data" / "storyCatalog.ts"
OUT_DIR = ROOT / "public" / "audio"
VOICE = "zh-TW-HsiaoChenNeural"
RATE = "-12%"
MAX_CONCURRENCY = 4

# Immersive place-name stories — no meta rules, same tour-guide tone as main line.
PLACE_STORIES: dict[str, dict[str, str]] = {
    "chiayi-hall-start": {
        "title": "從嘉義市府往南，先認平原的門牌",
        "placeLabel": "嘉義市政府",
        "script": "我們從嘉義市政府這一帶往南開。嘉義舊稱諸羅，後來才改成嘉義；市府附近的路名常常像一本薄薄的地方志，先把行政中心放在平原正中央，再把四周的街庄一圈圈往外推。你眼前這些看似平常的路口，其實都在告訴你：嘉義不是山城，是被田與風養大的平原城。往南一點，地名會開始變得更鄉下、也更有水氣。",
    },
    "chiayi-cultural": {
        "title": "文化路：夜市以前，先是一條生活路",
        "placeLabel": "嘉義文化路",
        "script": "文化路現在以夜市聞名，但名字裡的「文化」其實提醒你：這條路曾經被當成城市門面來經營。攤販、戲院、吃的、逛的擠在同一條脈上，久了就變成嘉義人的共同記憶。火雞肉飯、珍奶傳說、涼麵香氣，都不是突然冒出來的；它們是沿著這條路，一攤一攤長成地方口音。你經過這裡，等於經過嘉義晚上最會說話的一段門牌。",
    },
    "place-shui-shang-road": {
        "title": "水上：名字裡先帶著水聲",
        "placeLabel": "水上",
        "script": "前方路名開始把你帶進「水上」。這名字很直白：早期這一帶多埤塘、水澤與田水路，住的人等於住在水的上面與旁邊。後來機場來了，飛機從田中央起飛，水上就同時有了兩種聲音：一種是灌溉的水聲，一種是引擎的風聲。地名先報到，故事通常也不遠。",
    },
    "shuishang-airport-view": {
        "title": "南靖與水上：平原接頭的舊地名",
        "placeLabel": "水上／南靖",
        "script": "水上附近有個常被路牌帶過的名字：南靖。聽起來像從福建原鄉搬過來的地名記憶，清治移民常把故鄉的縣名、庄名一起帶來台灣。水上管的是水與田，南靖管的是人從哪來；兩個名字並排，你就聽得懂嘉南平原的身世——先有水路，再有人群，後來才有跑道。",
    },
    "place-houbi-sign": {
        "title": "後壁：聚落「背面」變成正面的名字",
        "placeLabel": "後壁",
        "script": "路牌寫「後壁」。在閩南語地名裡，後壁常常指聚落或房屋的背面、外側，本來是相對位置，不是正式大地名。結果人住久了，背面反而變成大家都會的地址。後壁後來以稻米與社區出名，但名字本身很生活：先有人指著說「那裡是後壁」，後來地圖也就跟著這樣寫。",
    },
    "xinying-crossroad": {
        "title": "新營：軍營搬走，名字留下",
        "placeLabel": "新營",
        "script": "新營這個名字，幾乎直接告訴你它的出身：清代這裡設過新的營盤、汛防，軍務與交通疊在一起，聚落就叫新營。後來糖業、鐵路、行政中心陸續進來，軍營的功能淡了，名字卻留下。你在新營聽到的節奏，常常是公務、糖業與平原市場混出來的；地名先把「營」字說清楚，後面的故事才好接。",
    },
    "place-madou-approach": {
        "title": "麻豆：先聽西拉雅的口音",
        "placeLabel": "麻豆",
        "script": "麻豆快到了。這個名字多半認為來自西拉雅族社名的漢字寫法，舊文獻裡有 Mattauw 一系的記法，漢人定居後才固定成「麻豆」。所以你聽到麻豆，先別只想到文旦；那是更早一層的平原口音，被漢字輕輕壓成兩個字，沿用到今天的路牌上。",
    },
    "madou-pomelo": {
        "title": "麻豆文旦：地名先到，果香後到",
        "placeLabel": "麻豆",
        "script": "麻豆跟文旦幾乎綁成一組關鍵字。地名來自更早的社名記憶，果香則是後來田園經濟寫上去的一筆。秋冬路邊紙箱一排排站著，像替麻豆做活動廣告。你就算不停車，也會懂為什麼大家說到麻豆，舌尖會先甜一下——那是地名與物產長期互相餵養的結果。",
    },
    "place-anding-road": {
        "title": "安定：求平安的命名習慣",
        "placeLabel": "安定",
        "script": "安定這個地名，很像漢人開墾時常許的願望：地要安，人要定。清治前後許多庄頭喜歡用安、平、福、興這類字眼，把心裡想要的秩序寫進門牌。安定就坐在台南往北的平原帶上，名字溫柔，道路務實；你開過路牌時，等於同時讀到一句古老的祝福。",
    },
    "annan-riverplain": {
        "title": "安南：安平之南的水鄉門牌",
        "placeLabel": "安南",
        "script": "安南，字面就像「安平之南」。這一帶河渠、魚塭、舊港道交錯，地名常跟水有關。你若覺得路忽然變開、風比較鹹，那就是安南在用平原與河口的尺度跟你打招呼。它不一定搶老街的鏡頭，卻把台南從甜度慢慢調成鹹度。",
    },
    "place-anping-roadsign": {
        "title": "安平：一口岸，多名片",
        "placeLabel": "安平",
        "script": "路牌出現安平。安平是台南最會被複述的名字之一：港口、城堡、老街、海風，全擠在同一組字裡。早年它是進出的門戶，後來變成記憶的門戶；你開車靠近時，地名本身已經先把層次疊好了，等你用眼睛去拆。",
    },
    "anping-fort": {
        "title": "安平古堡：名字底下的口岸層",
        "placeLabel": "安平古堡",
        "script": "安平古堡這一帶，地名與建築一起說故事。熱蘭遮的層、鄭氏的層、清廷與日治的層，最後變成觀光的層；但門口那兩個字「安平」始終在。你不是被丟到一個點位，而是沿路把平原聽完才走到口岸——這會讓安平聽起來比較像抵達，而不是突然出現的景點標籤。",
    },
    "anping-streetfood": {
        "title": "安平老街：門牌旁的氣味地圖",
        "placeLabel": "安平老街",
        "script": "安平老街附近，地名很短，氣味很長。蝦餅、芋頭、豆花、海鮮沿著巷子排隊，像替安平做另一種導覽。老街窄，不適合硬開進去繞；你在車上先聽名字，下車再用鼻子核對——這是安平很老實的招待方式。",
    },
    "yizaijin-cheng": {
        "title": "億載金城：海防寫進地名的幾何",
        "placeLabel": "億載金城",
        "script": "億載金城這個名字很正式，聽起來就有久一點的意思。棱堡線條清楚，像把海防圖蓋在海邊。它提醒你安平不只甜與鹹的小吃，也曾認真算過炮火角度；地名把「城」字留下，風景就把幾何留給眼睛。",
    },
    # Beads along Chiayi → Anping (approx. by latitude)
    "bead-roam-01": {
        "title": "北社尾一帶：社名留下的尾巴",
        "placeLabel": "嘉義南郊",
        "script": "離開市區往南，周圍常出現帶「社」的舊地名痕跡，像北社尾這類叫法。社，多半跟早期平埔聚落或庄社有關；尾，常指聚落延伸出去的那一端。所以北社尾聽起來很口語，其實是在說：這裡曾經是某個社的北邊尾巴。你開過這段田路，等於開過一條被日常口語保存下來的地圖邊注。",
    },
    "bead-roam-02": {
        "title": "南靖：把原鄉縣名搬來種田",
        "placeLabel": "水上南靖",
        "script": "水上附近有南靖。許多研究者與地方說法，會把它連到福建南靖一帶的移民記憶：人來了，把老家縣名也帶來當庄名，像在平原上按一個「我從哪裡來」的印章。南靖不一定天天上新聞，但路牌一出現，你就聽見清治移民常見的命名習慣——先安身，再把原鄉輕輕放下。",
    },
    "bead-roam-03": {
        "title": "柳林與水漆：靠水色命名的庄",
        "placeLabel": "水上沿路",
        "script": "水上四周舊地名常跟植物、水色綁在一起，像柳林、水漆林這類叫法。人看什麼多，就叫什麼；先有景，才有名。後來交通變快，名字被縮短、被行政區重劃，但水氣還在字裡。你若覺得這段路特別「平而濕」，那是地名先透露的氣候報告。",
    },
    "bead-roam-04": {
        "title": "菁寮：藍靛染出來的庄名",
        "placeLabel": "後壁菁寮",
        "script": "後壁有個很好聽的名字：菁寮。菁，指的是藍靛原料；寮，是工作寮、居住寮。早年這一帶種菁、製靛，庄名直接把產業寫上去。現在大家比較常把它跟老街、電影場景連在一起，但第一層意思其實很勤奮：這裡曾經靠一片藍，養活一整个寮。",
    },
    "bead-roam-05": {
        "title": "後壁寮仔：小字眼裡的大平原",
        "placeLabel": "後壁",
        "script": "後壁附近常見「寮」「埤」「廍」這類字尾。寮是人暫住或長住的棚屋感，埤是水，廍常跟糖業有關。把這些小字串起來，你會看見嘉南平原的工作現場：先挖水，再搭寮，後來才有比較像市鎮的路。地名像工具箱，不華麗，但每件都能用。",
    },
    "bead-roam-06": {
        "title": "新營北緣：營盤外的庄頭",
        "placeLabel": "新營北側",
        "script": "靠近新營北緣，很多小地名其實是營盤外圍長出來的。營在中間，庄在旁邊；人為了替軍務、糖務、鐵路服務，就在外圈住下來。所以你聽到的不一定是大景點名，而是「誰住在營的外面」這種很實際的地址學。平原城市常常這樣長：先有功能，再有門牌。",
    },
    "bead-roam-07": {
        "title": "新營：營字當地名的現場",
        "placeLabel": "新營",
        "script": "再往前，新營的「營」字會愈來愈合理。舊時營汛、交通節點與後來的糖鐵、行政中心疊在同一帶，名字就不肯改了。你在車裡看路寬車多，那是現代新營；耳朵若還留著「營」字，那是更早一層的駐防記憶。一個字，兩種時間。",
    },
    "bead-roam-08": {
        "title": "太子宮：廟名大過庄名的例子",
        "placeLabel": "新營太子宮",
        "script": "新營一帶有個常被當成地標的名字：太子宮。很多台灣聚落會發生一件事——廟太有名，最後地址跟著廟走。人約地方，不說幾鄰幾陌，直接說太子宮口。宗教門牌變成地理門牌，這在府城以北的平原很常見；你聽到廟名，往往也聽到生活中心在哪裡。",
    },
    "bead-roam-09": {
        "title": "往西的平原：下營、柳營的營字親戚",
        "placeLabel": "新營西側",
        "script": "離開新營往西、往南，你會一直碰到帶「營」的地名親戚：下營、柳營。營不一定都還有軍隊，但命名家族很清楚——這片平原曾經用營盤來理解空間。上、下、柳，像替營盤標方位與環境。路牌上的字很短，背後的制度史卻不短。",
    },
    "bead-roam-10": {
        "title": "茄苳與埤塘：植物地名的實用美學",
        "placeLabel": "下營沿路",
        "script": "這段路附近常見茄苳、埤、寮這類字。茄苳是大樹，常當聚落地標；埤是存水。漢人開墾時命名很節省：看見什麼重要資源，就寫進地名，省得別人找不到。所以這些名字不浪漫，卻很有效率，像幫平原貼上會呼吸的標籤。",
    },
    "bead-roam-11": {
        "title": "紅茄萣式的口音：土名漢字化",
        "placeLabel": "麻豆北緣",
        "script": "愈往麻豆，愈容易遇到聽起來拗口、寫起來像音譯的庄名。許多是先有口語土名，再硬找漢字去就音。結果看起來怪怪的，唸起來卻很在地。地名這時像口音標本：不是文案公司取的，是舌頭先決定、筆畫後補上的。",
    },
    "bead-roam-12": {
        "title": "港尾：港口退了，尾巴留下",
        "placeLabel": "麻豆港尾",
        "script": "麻豆外圍有港尾這類名字。港不一定指大海港，也可能是內河、渠道可泊處；尾則是末端。水道改道、港口功能消失後，名字還是不肯走。你開過港尾，等於開過一條已經乾成記憶的水線——地上未必看得到港，字裡還在。",
    },
    "bead-roam-13": {
        "title": "謝厝寮：姓氏做成的地址",
        "placeLabel": "麻豆謝厝寮",
        "script": "謝厝寮這種名字很台灣：謝是姓，厝是房子，寮是聚居單位。等於門牌直接寫「謝家人住這邊」。嘉南平原很多庄頭用姓氏命名，像把族譜攤在地圖上。你不必認識謝家人，也能從地名讀到開墾期的社會結構——先有人，才有路。",
    },
    "bead-roam-14": {
        "title": "麻豆街：社名之後的市街層",
        "placeLabel": "麻豆",
        "script": "進到麻豆本街附近，西拉雅社名的底層上面，又疊了漢人市街、庙口與果園經濟。地名只有兩個字，內容卻像千層糕。文旦是最新那一層甜味；再往下挖，還有水道、社寮與街市。开车經過時，你可以只聞果香，也可以把耳朵打開，聽字源一層層響。",
    },
    "bead-roam-15": {
        "title": "總爺與廍：糖業地名的殘響",
        "placeLabel": "麻豆南側",
        "script": "麻豆往南，偶爾還會碰到跟糖業有關的舊稱殘影，像廍、糖廠、總爺這類記憶。總爺原是職稱，後來常變成地名；廍則是製糖工作站。產業搬走了，字還掛在路上。平原的糖業史，有時不是館內展覽，而是路牌上沒擦乾淨的一筆。",
    },
    "bead-roam-16": {
        "title": "蘇厝：一姓一庄的安定北門",
        "placeLabel": "安定蘇厝",
        "script": "安定北側有蘇厝。厝就是家屋聚落，蘇是主姓。這種命名誠實得可愛：不問風花雪月，只問誰住在這。你在台南鄉下一直看到「某厝」「某寮」「某塭」，會懂開墾社會怎麼用家族單位理解土地。蘇厝兩個字，像一張寫了姓氏的門牌貼紙。",
    },
    "bead-roam-17": {
        "title": "安定：把願望寫成庄名",
        "placeLabel": "安定",
        "script": "安定到了。相較於音譯土名，安定這種漢字吉祥名，常出現在希望生活穩一點的年代。地安、人定，說出來就有安撫作用。今天你當路名看，它仍保留那種語氣：不是炫耀富裕，是祈求別亂。平原上很多溫柔的地名，其實都是這樣來的。",
    },
    "bead-roam-18": {
        "title": "港口與塭岸：安南前哨的水名",
        "placeLabel": "安定－安南交界",
        "script": "再往南，水的字眼會變多：港、塭、寮、溪。安南還沒正式進場，地名已經先濕起來。魚塭與渠道重劃過很多次，但命名邏輯穩定——有水的地方，就要在名字裡報到。你感覺風開始有鹹味，往往是路牌先通風報信。",
    },
    "bead-roam-19": {
        "title": "本淵寮：深水窩上的聚落",
        "placeLabel": "安南本淵寮",
        "script": "安南有本淵寮這類名字。淵，是深水；寮，是人住的單位。意思很接近：住在深水窩旁邊的寮仔。河口平原河道愛改道，深淵也可能變成淺埔，但名字記得住舊地形。開過這裡，等於聽了一句水岸考古：從前水有多深，人就有多靠近水。",
    },
    "bead-roam-20": {
        "title": "溪心寮：把家放在水道心上",
        "placeLabel": "安南溪心寮",
        "script": "溪心寮顧名思義，跟水道中心有關。人不一定真的住在河正中央，但相對位置被說成溪心，聽的人就懂方位。安南這種水鄉地名，常常是生活導航，不是文青命名。你跟著路走，字會提醒你：這裡的路是跟水商量過才長出來的。",
    },
    "bead-roam-21": {
        "title": "鹿耳門方向：河口舊門戶的回聲",
        "placeLabel": "安南往安平",
        "script": "靠近安平前，遠處歷史裡有個超有名的河口名字：鹿耳門。傳說與記載都把它寫成早年船隻進出的門戶，形狀像鹿耳，名稱就留下了。今天你未必正好開上古航道，但安南到安平這一段的風與水，仍會讓那個舊門戶在耳朵邊響一下——先有門，才有城。",
    },
    "bead-roam-22": {
        "title": "安平港邊：小地名擠成大風景",
        "placeLabel": "安平",
        "script": "進安平，石門、聚落、老街、港邊名字會忽然變密。口岸城市就是這樣：短距離內塞很多門牌，每個字都想講話。你放慢一點，讓路牌一個個進視線；安平的故事密度高，不是因為愛炫耀，是因為這裡曾經是整片海洋與平原交換掛號的櫃檯。",
    },
    "bead-roam-23": {
        "title": "安平尾聲：從庄名走到口岸名",
        "placeLabel": "安平",
        "script": "這一帶差不多是安平的核心氣息了。從嘉義平原一路聽下來：社尾、南靖、菁寮、新營、麻豆、蘇厝、本淵寮，最後收在安平兩個字裡。地名像一串珠，不一定顆顆名牌貨，但串起來就是你剛剛開過的台灣西部。先記得名字，風景會自己回來找你。",
    },
}


def patch_catalog() -> list[dict[str, str]]:
    text = CATALOG.read_text(encoding="utf-8")
    clips_for_audio: list[dict[str, str]] = []

    for clip_id, payload in PLACE_STORIES.items():
        # Replace title
        text, n1 = re.subn(
            rf"(id: '{re.escape(clip_id)}',\n\s*title: ')([^']*)(')",
            rf"\g<1>{payload['title']}\g<3>",
            text,
            count=1,
        )
        # Replace placeLabel
        text, n2 = re.subn(
            rf"(id: '{re.escape(clip_id)}',[\s\S]*?placeLabel: ')([^']*)(')",
            rf"\g<1>{payload['placeLabel']}\g<3>",
            text,
            count=1,
        )
        # Replace script (single-quoted, may contain escaped quotes rarely — ours don't)
        text, n3 = re.subn(
            rf"(id: '{re.escape(clip_id)}',[\s\S]*?script:\n\s*')([^']*)(')",
            rf"\g<1>{payload['script']}\g<3>",
            text,
            count=1,
        )
        # Prefer history tone for etymology; keep duration roughly synced to script length.
        approx_sec = max(45, min(110, int(len(payload["script"]) / 3.2)))
        text, _ = re.subn(
            rf"(id: '{re.escape(clip_id)}',[\s\S]*?durationSec: )(\d+)",
            rf"\g<1>{approx_sec}",
            text,
            count=1,
        )
        if clip_id.startswith("bead-") or clip_id.startswith("place-"):
            text, _ = re.subn(
                rf"(id: '{re.escape(clip_id)}',[\s\S]*?theme: ')([^']*)(')",
                r"\g<1>history\g<3>",
                text,
                count=1,
            )

        if n1 and n3:
            clips_for_audio.append(
                {
                    "id": clip_id,
                    "title": payload["title"],
                    "script": payload["script"],
                    "audioUrl": f"/audio/{clip_id}.mp3",
                }
            )
        else:
            print(f"WARN: patch incomplete for {clip_id}: title={n1} place={n2} script={n3}")

    # Always point roam drafts at neural mp3 paths (same voice pipeline as main line).
    text = text.replace(
        "audioUrl: draft.audioUrl ?? '',",
        "audioUrl: draft.audioUrl && draft.audioUrl.length > 0 ? draft.audioUrl : `/audio/${draft.id}.mp3`,",
    )

    CATALOG.write_text(text, encoding="utf-8")
    return clips_for_audio


async def synthesize(clips: list[dict[str, str]]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(MAX_CONCURRENCY)

    async def one(clip: dict[str, str]) -> None:
        out = OUT_DIR / f"{clip['id']}.mp3"
        # Always regenerate so rewritten scripts match audio.
        async with sem:
            print(f"TTS {clip['id']} ...")
            communicate = edge_tts.Communicate(clip["script"], VOICE, rate=RATE)
            await communicate.save(str(out))
            print(f"  -> {out.name} ({out.stat().st_size} bytes)")

    await asyncio.gather(*(one(c) for c in clips))


def main() -> None:
    clips = patch_catalog()
    print(f"Patched {len(clips)} catalog entries")
    asyncio.run(synthesize(clips))
    manifest = ROOT / "scripts" / "placename_clips.json"
    manifest.write_text(json.dumps(clips, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {manifest}")


if __name__ == "__main__":
    main()
