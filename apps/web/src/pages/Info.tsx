import { FORMULA_VERSION } from '@fittrack/engine';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card } from '../components/ui';

function InfoPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center text-sm text-emerald-strong dark:text-emerald"
      >
        ‹ 返回
      </Link>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {updated && <p className="text-xs text-slate-500 dark:text-slate-400">最後更新：{updated}</p>}
      <Card className="space-y-4 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </Card>
    </div>
  );
}

export function HowWeCalculate() {
  return (
    <InfoPage title="計算方法與資料來源" updated="2026-10-11">
      <p>
        所有數字都由公開、可檢查的公式計算（公式版本 {FORMULA_VERSION}
        ）。它們是估算，不是你身體的精確測量。
      </p>
      <h2>基礎代謝率（BMR）</h2>
      <p>
        使用 Mifflin–St Jeor 公式（1990）：10 × 體重 kg + 6.25 × 身高 cm − 5 × 年齡 + s。男性公式 s
        = +5，女性公式 s = −161；中性選項取兩者平均
        −78（產品選項，誤差可能較大）。此公式對多數成人的誤差約在 ±10% 內。
      </p>
      <h2>每日總消耗（TDEE）</h2>
      <p>
        BMR × 活動係數：久坐 1.2、輕度 1.375、中度 1.55、高度 1.725、極高
        1.9。係數已包含運動，所以運動消耗不會再加回每日預算，以免重複計算。
      </p>
      <h2>每日熱量目標</h2>
      <ul>
        <li>按你選的每週體重變化百分比計算，並以每公斤約 7700 kcal 作為初始估算。</li>
        <li>減脂的熱量赤字最多為 TDEE 的 25%；增重的盈餘每天最多 500 kcal。</li>
        <li>
          安全下限：不低於估算 BMR，也不低於 1200 kcal（女性公式）或 1500
          kcal（男性與中性）。下限高於 TDEE 時以維持熱量為目標。
        </li>
        <li>
          BMI 低於
          18.5（馬來西亞衛生部亞洲分界）時不提供減脂目標；懷孕、哺乳或有飲食失調病史時不提供熱量赤字。
        </li>
      </ul>
      <h2>三大營養素</h2>
      <ul>
        <li>
          蛋白質按每公斤體重計算（減脂與增肌預設 1.6 g/kg，健康增重 1.4，維持 1.2），BMI ≥ 27.5 時用
          BMI 25 對應的體重；最多佔總熱量 35%。有腎病時固定 0.8 g/kg。
        </li>
        <li>脂肪佔總熱量 25%（範圍 20–35%）；碳水化合物為剩餘熱量，盡量不低於 130 g。</li>
        <li>熱量換算：蛋白質與碳水 4 kcal/g、脂肪 9 kcal/g。</li>
      </ul>
      <h2>趨勢體重與動態調整</h2>
      <p>
        趨勢體重是每日體重的指數加權移動平均（α = 0.1）。有足夠資料時（3
        週內至少八成日子完整記錄飲食、至少 10
        次體重），系統用平均攝取和趨勢變化推算實際消耗，建議每次最多 ±150 kcal
        的調整，由你決定是否接受。
      </p>
      <h2>食物資料</h2>
      <p>
        內建食物的營養數值來自美國農業部 USDA FoodData Central（SR
        Legacy，公有領域），每項都標示來源編號。自訂食物由你按包裝標籤輸入，只有你看得到。
      </p>
    </InfoPage>
  );
}

export function Disclaimer() {
  return (
    <InfoPage title="健康免責聲明" updated="2026-10-11">
      <p>FitTrack 是健康與生活習慣管理工具，不是醫療器材，不提供醫療診斷、治療或處方。</p>
      <ul>
        <li>
          所有熱量、營養素和運動建議都是根據公開公式和你提供的資料所作的估算，可能與你的實際情況不同。
        </li>
        <li>
          如果你有任何疾病、正在懷孕或哺乳、正在服用會影響體重或血糖的藥物，或曾有飲食失調，請在改變飲食或運動前先諮詢醫生或註冊營養師。
        </li>
        <li>運動時如感到胸痛、頭暈、呼吸困難或持續疼痛，請立即停止並尋求醫療協助。</li>
        <li>本服務只供 18 歲或以上人士使用。</li>
      </ul>
      <p>此文件為草稿，正式公開上線前會由法律專業人士審閱。</p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage title="隱私政策" updated="2026-10-11">
      <p>這份政策說明 FitTrack 目前版本如何處理你的資料。</p>
      <h2>我們收集什麼</h2>
      <p>
        你在設定和使用時輸入的資料：出生日期、身高、體重、腰圍、目標、活動水平、健康篩查答案、飲食偏好、飲食記錄和訓練記錄。根據馬來西亞《2010
        年個人資料保護法》（PDPA），健康相關資料屬於敏感個人資料，我們只在你明確同意後使用。
      </p>
      <h2>資料存放在哪裡</h2>
      <p>
        目前版本的所有資料只保存在你這部裝置的瀏覽器（localStorage）中，不會傳送到我們或任何第三方的伺服器。清除瀏覽器資料、使用私密瀏覽模式或更換裝置，資料都會消失。
      </p>
      <h2>用途</h2>
      <p>
        只用於在你的裝置上計算熱量目標、營養建議、趨勢和每日任務。我們不出售資料，也不使用廣告追蹤。
      </p>
      <h2>你的權利</h2>
      <ul>
        <li>隨時在「我」頁面查看和修改資料。</li>
        <li>隨時匯出全部資料（JSON）。</li>
        <li>隨時刪除全部資料。</li>
      </ul>
      <h2>未來變更</h2>
      <p>
        之後加入帳號與雲端同步時，資料會存放在雲端資料庫。屆時我們會更新本政策，並在你同意後才開始上傳。
      </p>
      <p>此文件為草稿，正式公開上線前會由法律專業人士按 PDPA 審閱，並提供英文及馬來文版本。</p>
    </InfoPage>
  );
}
