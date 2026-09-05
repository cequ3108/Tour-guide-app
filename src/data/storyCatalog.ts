import { NARRATION_CLIPS, type NarrationClip } from './narration'
import {
  CORRIDOR_HUWEI_TO_XINYING,
  ROAM_CHIAYI_TO_ANPING,
} from './roads'
import { POINTS_OF_INTEREST, type StoryTheme } from './route'
import {
  buildRouteMetrics,
  interpolateRoute,
  type LatLng,
} from '../lib/geo'

export type StoryLayer = 'story' | 'placename'

export type StorySpot = NarrationClip & {
  lat: number
  lng: number
  county: '雲林' | '嘉義' | '台南' | '跨縣'
  layer: StoryLayer
}

type NewSpotDraft = {
  id: string
  title: string
  placeLabel: string
  poiId: string | null
  theme: StoryTheme
  durationSec: number
  script: string
  lat: number
  lng: number
  county: StorySpot['county']
  layer: StoryLayer
  audioUrl?: string
}

const POI_BY_ID = Object.fromEntries(
  POINTS_OF_INTEREST.map((p) => [p.id, p]),
) as Record<string, (typeof POINTS_OF_INTEREST)[number]>

const corridorMetrics = buildRouteMetrics(CORRIDOR_HUWEI_TO_XINYING.waypoints)

function countyForLatLng(lat: number, lng: number): StorySpot['county'] {
  if (lat >= 23.62) return '雲林'
  if (lat >= 23.4) return '嘉義'
  if (lng <= 120.55) return '台南'
  return '跨縣'
}

function positionOnCorridor(progress: number): LatLng {
  const { lat, lng } = interpolateRoute(
    CORRIDOR_HUWEI_TO_XINYING.waypoints,
    corridorMetrics.segLens,
    corridorMetrics.total,
    progress,
  )
  return { lat, lng }
}

function enrichLegacyClip(clip: NarrationClip): StorySpot {
  if (clip.poiId && POI_BY_ID[clip.poiId]) {
    const poi = POI_BY_ID[clip.poiId]
    return {
      ...clip,
      lat: poi.lat,
      lng: poi.lng,
      county: poi.county as StorySpot['county'],
      layer: 'story',
    }
  }
  const mid = (clip.progressMin + clip.progressMax) / 2
  const pos = positionOnCorridor(Math.min(0.99, Math.max(0.01, mid)))
  const isPlacename =
    /地名|路名|村|庄|過渡|沿路|鄉道|聚落/.test(clip.title) ||
    /一帶|沿線|村落|過渡/.test(clip.placeLabel)
  return {
    ...clip,
    lat: pos.lat,
    lng: pos.lng,
    county: countyForLatLng(pos.lat, pos.lng),
    layer: isPlacename ? 'placename' : 'story',
  }
}

/** Snap demo spots onto the OSRM ribbon so vision-cone picks stay reliable. */
const PATH_SNAPS: Record<string, { lat: number; lng: number }> = {
  'chiayi-hall-start': { lat: 23.479116, lng: 120.449096 },
  'chiayi-cultural': { lat: 23.47927, lng: 120.448972 },
  'place-shui-shang-road': { lat: 23.4508, lng: 120.4342 },
  'shuishang-airport-view': { lat: 23.431433, lng: 120.415515 },
  'place-houbi-sign': { lat: 23.38, lng: 120.39 },
  'xinying-crossroad': { lat: 23.305233, lng: 120.316369 },
  'place-madou-approach': { lat: 23.2, lng: 120.255 },
  'madou-pomelo': { lat: 23.183654, lng: 120.248508 },
  'place-anding-road': { lat: 23.12, lng: 120.226 },
  'annan-riverplain': { lat: 23.047192, lng: 120.188634 },
  'place-anping-roadsign': { lat: 23.02, lng: 120.17 },
  'anping-fort': { lat: 23.000928, lng: 120.160764 },
  'anping-streetfood': { lat: 23.001138, lng: 120.161629 },
  'yizaijin-cheng': { lat: 23.000928, lng: 120.160764 },
}

const ROAM_SPOT_DRAFTS: NewSpotDraft[] = [
  {
    id: 'chiayi-hall-start',
    title: '從市政府出發的平原城市',
    placeLabel: '嘉義市政府',
    poiId: 'chiayi-hall',
    theme: 'people',
    durationSec: 88,
    lat: 23.47912,
    lng: 120.44912,
    county: '嘉義',
    layer: 'story',
    script:
      '我們人在嘉義市政府這一帶。今天不趕抵達，也不綁死哪一條國道；你往南晃，系統就順著你眼前的路講。嘉義市區的個性很清楚：白天像公務員準時打卡，傍晚又突然變得很會吃。你如果剛起步，先把視線放在前方路口與路牌——接下來我會優先講「你即將看到」或「正在進入視野」的地方，而不是遙遠地圖上的直線捷徑。',
  },
  {
    id: 'chiayi-cultural',
    title: '文化路不是只有晚上才醒',
    placeLabel: '嘉義文化路',
    poiId: 'chiayi',
    theme: 'food',
    durationSec: 92,
    lat: 23.4799,
    lng: 120.4498,
    county: '嘉義',
    layer: 'story',
    script:
      '文化路對很多人是夜市的代名詞，但其實這條路白天也在上班：店家補貨、老人喝茶、學生抄捷徑。嘉義的好吃常常不是隱藏版，是「你經過太多次，反而忘記它有名」。火雞肉飯、涼麵、珍奶鼻祖傳說，全都可以在附近被你的胃突然提告。若你等一下繞去文化路一帶，記得：故事可以邊開邊聽，但停車位要自己負責。',
  },
  {
    id: 'place-shui-shang-road',
    title: '路牌先報到：往水上',
    placeLabel: '水上路名過渡',
    poiId: null,
    theme: 'nature',
    durationSec: 55,
    lat: 23.4505,
    lng: 120.435,
    county: '嘉義',
    layer: 'placename',
    script:
      '前方路名開始出現「水上」的氣味了。還沒有大景點逼你停車，我們先用路牌當旁白：水上，顧名思義跟水很熟——埤塘、田水路、還有機場起降帶起來的風。漫遊模式最舒服的就是這種時候：眼前還只是路名，耳朵已經先到位。',
  },
  {
    id: 'shuishang-airport-view',
    title: '水上：平原上的起飛點',
    placeLabel: '水上',
    poiId: 'shuishang',
    theme: 'industry',
    durationSec: 90,
    lat: 23.4286,
    lng: 120.4164,
    county: '嘉義',
    layer: 'story',
    script:
      '水上常被當成「去機場的那個鄉」，但對嘉義人來說，它更像平原交通的接頭。飛機在頭上過，田在旁邊排班，省道在中間載著上班族與阿公阿媽。你如果此刻正沿著實際道路南下，而不是地圖上的切線，會更懂台灣西部：看起來平，路線卻很會轉彎——因為田埂、排水溝與聚落，比直線更有發言權。',
  },
  {
    id: 'place-houbi-sign',
    title: '後壁兩個字出現了',
    placeLabel: '後壁路牌',
    poiId: null,
    theme: 'history',
    durationSec: 52,
    lat: 23.38,
    lng: 120.39,
    county: '台南',
    layer: 'placename',
    script:
      '看前方路牌：後壁。地名很像房子結構，聽起來卻很文學。還沒講大故事前，先讓路名幫你切場景——你已經從嘉義平原滑進台南的北門戶。這種「先看到字、再進入地方」的節奏，就是視線驅動說書想給你的臨場感。',
  },
  {
    id: 'xinying-crossroad',
    title: '新營：北台南的轉運脾氣',
    placeLabel: '新營',
    poiId: 'xinying',
    theme: 'history',
    durationSec: 95,
    lat: 23.3051,
    lng: 120.3168,
    county: '台南',
    layer: 'story',
    script:
      '新營這一帶，像北台南的調度中心：糖業記憶、鐵路節奏、公務機關與菜市場同框。你不一定要停很久，但你會感覺路變寬、車變多、招牌變密。若你今天的終點在安平，新營比較像中場休息的哨音——提醒你：後面還有麻豆、安定、安南，風景會從糖與稻，慢慢轉成河海與老城。',
  },
  {
    id: 'place-madou-approach',
    title: '往麻豆的路名開始吵你',
    placeLabel: '麻豆接近中',
    poiId: null,
    theme: 'food',
    durationSec: 58,
    lat: 23.185,
    lng: 120.248,
    county: '台南',
    layer: 'placename',
    script:
      '路牌開始把「麻豆」兩個字塞進視線了。還沒看到文旦園，胃可能先舉手。沒有大故事時，我們就讓地名過渡：麻豆聽起來像要你停車買水果，也像在提醒西部平原的物產說話方式——先報地名，再報口味。',
  },
  {
    id: 'madou-pomelo',
    title: '麻豆文旦的香氣預告',
    placeLabel: '麻豆',
    poiId: 'madou',
    theme: 'food',
    durationSec: 88,
    lat: 23.1815,
    lng: 120.2512,
    county: '台南',
    layer: 'story',
    script:
      '麻豆跟文旦的綁定，差不多是台灣物產行銷教科書。秋冬一到，路邊箱子比路燈還亮。你就算不買，也會被那種「產地直送」的氣勢刷一波存在感。麻豆不只水果，老街、廟口與在地小吃也會在繞路時突然出現——這就是不固定路線的好處：你抄一條比較外環的路，故事清單會跟著你的視線改寫。',
  },
  {
    id: 'place-anding-road',
    title: '安定：名字很佛，車速很現實',
    placeLabel: '安定',
    poiId: null,
    theme: 'legend',
    durationSec: 50,
    lat: 23.12,
    lng: 120.226,
    county: '台南',
    layer: 'placename',
    script:
      '前方是安定方向。地名聽起來該放慢呼吸，但省道車流不一定答應。這種反差很台南郊外：路名溫柔，交通務實。先記路牌，後面若視野裡冒出聚落與廟埕，我再把故事接上去。',
  },
  {
    id: 'annan-riverplain',
    title: '安南：河海交界前的開闊',
    placeLabel: '安南',
    poiId: 'annan',
    theme: 'nature',
    durationSec: 86,
    lat: 23.048,
    lng: 120.185,
    county: '台南',
    layer: 'story',
    script:
      '安南這一帶開始有「快到海邊」的開闊感。天空變大，風比較鹹，路網也比較像水鄉——河渠、魚塭、工業區與住宅混著長。你往安平前進時，安南常是被省略的中間頁；但若你真的沿著地表道路開，會發現它很長，而且很誠實：台南不是只有老街金黃色，還有大片仍在工作的濕地邊緣。',
  },
  {
    id: 'place-anping-roadsign',
    title: '安平兩個字進視線了',
    placeLabel: '安平路牌',
    poiId: null,
    theme: 'history',
    durationSec: 48,
    lat: 23.02,
    lng: 120.17,
    county: '台南',
    layer: 'placename',
    script:
      '路牌寫安平。先別急著搜尋攻略，讓眼前的字替你開場。安平是台南最會被拍的名字之一，但真正臨場感，是你從車窗看到街巷變窄、遊客變多、海風變明顯的那幾分鐘。',
  },
  {
    id: 'anping-fort',
    title: '安平古堡：層層疊起來的口岸',
    placeLabel: '安平古堡',
    poiId: 'anping',
    theme: 'history',
    durationSec: 100,
    lat: 23.00135,
    lng: 120.16065,
    county: '台南',
    layer: 'story',
    script:
      '安平古堡這一帶，是台灣口岸史的壓縮檔：熱蘭遮、鄭氏、清廷、日治到現代觀光，全部疊在同一小塊土地。你站在車裡看，可能先看到遊覽車與芋頭酥；但若把視線拉遠一點，會發現安平真正厲害的是「位置」——河海交會，誰掌握這裡，誰就比較能說話。今天你不是被導航丟到點位，而是一路沿路開到這裡；這種抵達感，會讓歷史比較不像考卷，而像你剛剛親身穿越的距離。',
  },
  {
    id: 'anping-streetfood',
    title: '安平街頭的甜鹹攻勢',
    placeLabel: '安平老街',
    poiId: 'anping',
    theme: 'food',
    durationSec: 84,
    lat: 23.0009,
    lng: 120.1622,
    county: '台南',
    layer: 'story',
    script:
      '安平的食物很會攔車：蝦餅、芋頭、豆花、海鮮，排隊人潮本身就是地標。老街窄、味道密，適合走走停停，不太適合硬開進去繞圈。若你還在車上，就把這段當預告片——等一下下車，故事會改由胃來續集。',
  },
  {
    id: 'yizaijin-cheng',
    title: '億載金城：海防的幾何作業',
    placeLabel: '億載金城',
    poiId: 'anping',
    theme: 'history',
    durationSec: 90,
    lat: 22.9885,
    lng: 120.1602,
    county: '台南',
    layer: 'story',
    script:
      '億載金城是安平另一張名片：棱堡線條清楚，像把教科書上的海防圖放大蓋在海邊。它提醒你安平不只浪漫老街，也曾認真算過炮火角度。若你的漫遊還有電量，繞到這一帶，海風會把「台南」從甜度調成鹹度。',
  },
  {
    id: 'bead-roam-01',
    title: '沿路地名過渡 · 嘉義',
    placeLabel: '嘉義沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.454903,
    lng: 120.4348,
    county: '嘉義',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-02',
    title: '沿路地名過渡 · 嘉義',
    placeLabel: '嘉義沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.431257,
    lng: 120.414923,
    county: '嘉義',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-03',
    title: '沿路地名過渡 · 嘉義',
    placeLabel: '嘉義沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.419351,
    lng: 120.389295,
    county: '嘉義',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-04',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.388608,
    lng: 120.375177,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-05',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.360777,
    lng: 120.359388,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-06',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.333153,
    lng: 120.357478,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-07',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.309545,
    lng: 120.355082,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-08',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.307323,
    lng: 120.322815,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-09',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.307137,
    lng: 120.29181,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-10',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.283009,
    lng: 120.275435,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-11',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.255318,
    lng: 120.256965,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-12',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.225255,
    lng: 120.241163,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-13',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.19025,
    lng: 120.236247,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-14',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.183675,
    lng: 120.244393,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-15',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.160555,
    lng: 120.230907,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-16',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.130179,
    lng: 120.237918,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-17',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.115672,
    lng: 120.22713,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-18',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.093005,
    lng: 120.209845,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-19',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.067219,
    lng: 120.191479,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-20',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.039811,
    lng: 120.186453,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-21',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.012704,
    lng: 120.185196,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-22',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.002306,
    lng: 120.161248,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  },
  {
    id: 'bead-roam-23',
    title: '沿路地名過渡 · 台南',
    placeLabel: '台南沿路',
    poiId: null,
    theme: 'nature',
    durationSec: 42,
    lat: 23.000928,
    lng: 120.160764,
    county: '台南',
    layer: 'placename',
    script:
      '這一段眼前暫時沒有特別強的景點名片，我們先用沿路的地景與路名過渡。你繼續看前方車道與招牌；只要視線裡出現下一個可講的地方，我就會立刻把故事接回去。漫遊說書不怕空窗，怕的是硬塞一個你根本看不見的遠方點。',
  }
]

function draftToSpot(draft: NewSpotDraft): StorySpot {
  const snap = PATH_SNAPS[draft.id]
  return {
    id: draft.id,
    title: draft.title,
    placeLabel: draft.placeLabel,
    poiId: draft.poiId,
    theme: draft.theme,
    progressMin: 0,
    progressMax: 1,
    durationSec: draft.durationSec,
    script: draft.script,
    audioUrl: draft.audioUrl ?? '',
    lat: snap?.lat ?? draft.lat,
    lng: snap?.lng ?? draft.lng,
    county: draft.county,
    layer: draft.layer,
  }
}

const legacySpots = NARRATION_CLIPS.map(enrichLegacyClip)
const roamSpots = ROAM_SPOT_DRAFTS.map(draftToSpot)

/** Deduplicate by id — roam drafts win when ids collide. */
export const STORY_SPOTS: StorySpot[] = (() => {
  const map = new Map<string, StorySpot>()
  for (const spot of legacySpots) map.set(spot.id, spot)
  for (const spot of roamSpots) map.set(spot.id, spot)
  return [...map.values()]
})()

export const STORY_SPOTS_BY_ID = Object.fromEntries(
  STORY_SPOTS.map((s) => [s.id, s]),
) as Record<string, StorySpot>

export const ROAM_MAP_POIS: Array<{
  id: string
  name: string
  county: string
  lat: number
  lng: number
  blurb: string
}> = [
  ...POINTS_OF_INTEREST.map((p) => ({
    id: p.id,
    name: p.name,
    county: p.county,
    lat: p.lat,
    lng: p.lng,
    blurb: p.blurb,
  })),
  {
    id: 'chiayi-hall',
    name: '嘉義市政府',
    county: '嘉義',
    lat: 23.47912,
    lng: 120.44912,
    blurb: '漫遊示範起點：從市政中心往南開。',
  },
  {
    id: 'madou',
    name: '麻豆',
    county: '台南',
    lat: 23.1815,
    lng: 120.2512,
    blurb: '文旦與街巷氣味很濃的中繼站。',
  },
  {
    id: 'annan',
    name: '安南',
    county: '台南',
    lat: 23.048,
    lng: 120.185,
    blurb: '河海交界前的開闊地帶。',
  },
  {
    id: 'anping',
    name: '安平',
    county: '台南',
    lat: 23.00135,
    lng: 120.16065,
    blurb: '口岸、老街與海風疊在一起的終點氛圍。',
  },
]

export const REGION_META = {
  brand: '途聞',
  title: '雲嘉南漫遊說書',
  subtitle:
    '不綁死路線：系統沿著你正在開的實際道路前進，並優先講「即將／正在進入視線」的故事；沒有景點時，就用路名與地名過渡。',
  region: '雲林 · 嘉義 · 台南',
  demoPathLabel: ROAM_CHIAYI_TO_ANPING.label,
  from: ROAM_CHIAYI_TO_ANPING.fromLabel,
  to: ROAM_CHIAYI_TO_ANPING.toLabel,
  approxKm: ROAM_CHIAYI_TO_ANPING.distanceKm,
  driveMinutes: ROAM_CHIAYI_TO_ANPING.durationMin,
}

export function totalStoryMinutes(spots: StorySpot[] = STORY_SPOTS) {
  return Math.round(spots.reduce((sum, s) => sum + s.durationSec, 0) / 60)
}
