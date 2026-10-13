import { FORMULA_VERSION } from '@fittrack/engine';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BackButton, Card } from '../components/ui';
import { SG_FOODID_ACCESSED, SG_FOODID_URL } from '../data/foodsSg';

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
      <BackButton />
      <h1 className="text-2xl font-semibold">{title}</h1>
      {updated && <p className="text-xs text-slate-600 dark:text-slate-300">最后更新：{updated}</p>}
      <Card className="space-y-4 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </Card>
    </div>
  );
}

export function HowWeCalculate() {
  return (
    <InfoPage title="计算方法与资料来源" updated="2026-10-13">
      <p>
        所有数字都由公开、可检查的公式计算（公式版本 {FORMULA_VERSION}
        ）。它们是估算，不是你身体的精确测量。
      </p>
      <h2>基础代谢率（BMR）</h2>
      <p>
        使用 Mifflin–St Jeor 公式（1990）：10 × 体重 kg + 6.25 × 身高 cm − 5 × 年龄 + s。男性公式 s
        = +5，女性公式 s = −161；中性选项取两者平均
        −78（产品选项，误差可能较大）。此公式对多数成人的误差约在 ±10% 内。
      </p>
      <h2>每日总消耗（TDEE）</h2>
      <p>
        BMR × 活动系数：久坐 1.2、轻度 1.375、中度 1.55、高度 1.725、极高
        1.9。系数已包含运动，所以运动消耗不会再加回每日预算，以免重复计算。
      </p>
      <h2>每日热量目标</h2>
      <ul>
        <li>按你选的每周体重变化百分比计算，并以每公斤约 7700 kcal 作为初始估算。</li>
        <li>减脂的热量赤字最多为 TDEE 的 25%；增重的盈余每天最多 500 kcal。</li>
        <li>
          安全下限：不低于估算 BMR，也不低于 1200 kcal（女性公式）或 1500
          kcal（男性与中性）。下限高于 TDEE 时以维持热量为目标。
        </li>
        <li>
          BMI 低于
          18.5（马来西亚卫生部亚洲分界）时不提供减脂目标；怀孕、哺乳或有饮食失调病史时不提供热量赤字。
        </li>
      </ul>
      <h2>三大营养素</h2>
      <ul>
        <li>
          蛋白质按每公斤体重计算（减脂与增肌默认 1.6 g/kg，健康增重 1.4，维持 1.2），BMI ≥ 27.5 时用
          BMI 25 对应的体重；最多占总热量 35%。有肾病时固定 0.8 g/kg。
        </li>
        <li>脂肪占总热量 25%（范围 20–35%）；碳水化合物为剩余热量，尽量不低于 130 g。</li>
        <li>热量换算：蛋白质与碳水 4 kcal/g、脂肪 9 kcal/g。</li>
      </ul>
      <h2>趋势体重与动态调整</h2>
      <p>
        趋势体重是每日体重的指数加权移动平均（α = 0.1）。有足够资料时（3
        周内至少八成日子完整记录饮食、至少 10
        次体重），系统用平均摄取和趋势变化推算实际消耗，建议每次最多 ±150 kcal
        的调整，由你决定是否接受。
      </p>
      <h2>喝水目标</h2>
      <p>
        参考欧洲食品安全局（EFSA, 2010）的每日总水分适宜摄取量：女性 2.0 升、男性 2.5
        升，其中约两成来自食物，所以饮水参考约为女性 1,600 ml、男性 2,000 ml（中性公式取 1,800
        ml）。天气热、出汗多或运动时需要更多；有肾脏或心脏问题请按医生建议。
      </p>
      <h2>食物资料</h2>
      <p>
        内建的本地菜式（nasi lemak、roti canai、鸡饭等）来自新加坡保健促进局 SG FoodID
        数据库；基本食材来自美国农业部 USDA FoodData Central（SR
        Legacy，公有领域）。每项都标示来源编号。自订食物由你按包装标签输入，只有你看得到。
      </p>
      <h2>AI 拍照算热量</h2>
      <p>
        照片由 AI 视觉模型分析（Google Gemini 免费版；忙碌时依次改用备用模型，最后是 Cloudflare
        Workers AI）。AI
        会列出每样食物并估算克数。如果某样食物是上面数据库里的菜式，热量按数据库的化验数值计算，只有份量是
        AI 估的；其他食物的热量也是 AI
        估算。系统会剔除不合理的数字（例如营养素重量超过食物本身），并用蛋白质、碳水、脂肪（4/4/9
        kcal/g）检查热量。照片估算份量的误差可能有两三成，所以每次都请你确认和调整。
      </p>
      <p>
        <Link to="/legal/credits" className="underline">
          资料来源
        </Link>
      </p>
    </InfoPage>
  );
}

export function Disclaimer() {
  return (
    <InfoPage title="健康免责声明" updated="2026-10-11">
      <p>EatHealthee 是健康与生活习惯管理工具，不是医疗器材，不提供医疗诊断、治疗或处方。</p>
      <ul>
        <li>
          所有热量、营养素和运动建议都是根据公开公式和你提供的资料所作的估算，可能与你的实际情况不同。
        </li>
        <li>
          如果你有任何疾病、正在怀孕或哺乳、正在服用会影响体重或血糖的药物，或曾有饮食失调，请在改变饮食或运动前先咨询医生或注册营养师。
        </li>
        <li>运动时如感到胸痛、头晕、呼吸困难或持续疼痛，请立即停止并寻求医疗协助。</li>
        <li>本服务只供 18 岁或以上人士使用。</li>
      </ul>
      <p>此文件为草稿，正式公开上线前会由法律专业人士审阅。</p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage title="隐私政策" updated="2026-10-13">
      <p>这份政策说明 EatHealthee 目前版本如何处理你的资料。</p>
      <h2>我们收集什么</h2>
      <p>
        你在设置和使用时输入的资料：出生日期、身高、体重、腰围、目标、活动水平、健康筛查答案、饮食偏好、饮食记录和训练记录。根据马来西亚《2010
        年个人资料保护法》（PDPA），健康相关资料属于敏感个人资料，我们只在你明确同意后使用。
      </p>
      <h2>资料存放在哪里</h2>
      <p>
        <strong>没有登录时：</strong>
        所有资料只保存在你这部设备的浏览器中，不会传送到任何服务器。清除浏览器资料、使用私密浏览模式或更换设备，资料都会消失。
      </p>
      <p>
        <strong>登录后：</strong>资料经加密连线（HTTPS）保存到你的账号，由我们使用的数据库服务商
        Supabase
        代为保存，服务器位于新加坡。数据库设有权限规则，每个账号只能读写自己的资料。设备上也会保留一份副本，让你离线时也能使用。注册时你会被要求明确同意这项保存。
      </p>
      <p>
        <strong>AI 拍照：</strong>
        只在你按下拍照并同意后，照片才会在手机上缩小（并去掉位置等资料）后，经我们的服务器转交
        Google Gemini 或 Cloudflare Workers AI
        分析。我们不保存照片，只保存你确认后的食物记录。Google 的免费服务条款容许 Google
        使用上传内容改进其产品，请不要拍到人脸或个人资料。为了公平使用免费额度，我们会记录每个账号每天用了几次（不记录照片内容）。
      </p>
      <h2>用途</h2>
      <p>
        只用于计算热量目标、营养建议、趋势和每日任务，以及在你的设备之间同步。我们不出售资料，也不使用广告追踪。
      </p>
      <h2>你的权利</h2>
      <ul>
        <li>随时在“我”页面查看和修改资料。</li>
        <li>随时导出全部资料（JSON）。</li>
        <li>随时删除全部资料；登录时会同时从云端删除。</li>
        <li>删除登录账号本身（Email 和密码）的功能即将加入。</li>
      </ul>
      <h2>未来变更</h2>
      <p>政策有重要变更时，我们会在网站内通知你。</p>
      <p>此文件为草稿，正式公开上线前会由法律专业人士按 PDPA 审阅，并提供英文及马来文版本。</p>
    </InfoPage>
  );
}

export function Credits() {
  return (
    <InfoPage title="资料来源" updated="2026-10-13">
      <h2>本地菜式营养资料</h2>
      <p>
        Contains information from the Singapore Food Insights Database (SG FoodID), Health Promotion
        Board, accessed on {SG_FOODID_ACCESSED}, which is made available under the terms of the SG
        FoodID Terms of Use:{' '}
        <a href={SG_FOODID_URL} className="break-all underline" target="_blank" rel="noreferrer">
          {SG_FOODID_URL}
        </a>
        . The information is provided &quot;as is&quot; without warranty. EatHealthee is not
        endorsed by or affiliated with the Health Promotion Board.
      </p>
      <p>
        本网站的本地菜式营养数值取自新加坡保健促进局 SG FoodID
        数据库，数字未经修改；中文名称与份量按钮为我们加上。新加坡与马来西亚的做法和份量可能不同。
      </p>
      <h2>基本食材营养资料</h2>
      <p>U.S. Department of Agriculture, FoodData Central（SR Legacy），公有领域（CC0）。</p>
    </InfoPage>
  );
}
