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
      {updated && (
        <p className="text-xs text-slate-600 dark:text-slate-300">Last updated: {updated}</p>
      )}
      <Card className="space-y-4 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </Card>
    </div>
  );
}

export function HowWeCalculate() {
  return (
    <InfoPage title="How we calculate" updated="2026-10-15">
      <p>
        Every number comes from published formulas you can check (formula version {FORMULA_VERSION}
        ). They are estimates, not exact measurements of your body.
      </p>
      <h2>Basal metabolic rate (BMR)</h2>
      <p>
        We use the Mifflin–St Jeor equation (1990): 10 × weight kg + 6.25 × height cm − 5 × age + s.
        The male formula uses s = +5 and the female formula s = −161; the neutral option uses their
        average, −78 (a product choice that may be less precise). For most adults the equation is
        within about ±10%.
      </p>
      <h2>Total daily energy expenditure (TDEE)</h2>
      <p>
        BMR × activity factor: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725, extra
        active 1.9. The factor already includes exercise, so exercise calories are not added back to
        your budget, which would count them twice.
      </p>
      <h2>Daily calorie target</h2>
      <ul>
        <li>
          Based on the weekly weight change you choose, using about 7,700 kcal per kg as a starting
          estimate.
        </li>
        <li>
          A fat-loss deficit is at most 25% of TDEE; a weight-gain surplus is at most 500 kcal a
          day.
        </li>
        <li>
          Safety floor: never below your estimated BMR, and never below 1,200 kcal (female formula)
          or 1,500 kcal (male and neutral). If the floor is above your TDEE, the target is
          maintenance.
        </li>
        <li>
          No fat-loss target when BMI is below 18.5 (Malaysian Ministry of Health Asian cut-off),
          and no calorie deficit during pregnancy, breastfeeding or with a history of eating
          disorders.
        </li>
      </ul>
      <h2>Macronutrients</h2>
      <ul>
        <li>
          Protein per kg of body weight (1.6 g/kg by default for fat loss and muscle gain, 1.4 for
          weight gain, 1.2 for maintenance). At BMI 27.5 or above, the weight for BMI 25 is used. At
          most 35% of calories. Fixed at 0.8 g/kg with kidney disease.
        </li>
        <li>
          Fat is 25% of calories (range 20–35%); carbs make up the rest, kept at 130 g or more where
          possible.
        </li>
        <li>Energy: protein and carbs 4 kcal/g, fat 9 kcal/g.</li>
      </ul>
      <h2>Trend weight and target suggestions</h2>
      <p>
        Trend weight is an exponentially weighted moving average of your daily weigh-ins (α = 0.1).
        With enough data (at least 80% of days ticked as complete and at least 10 weigh-ins in 3
        weeks), we estimate what you really burn from your average intake and trend change, and
        suggest a change of at most ±150 kcal at a time. You decide whether to accept it.
      </p>
      <h2>Water guide</h2>
      <p>
        Based on body weight: about 35–40 ml per kg for normal activity, 30–35 ml for mostly sitting
        in air-conditioning, and 40–45 ml if you are active or sweat a lot (choose with "Adjust" on
        the Today page). It is a practical guide, not a strict number; drink more in hot weather.
        With kidney or heart conditions, follow your doctor&apos;s advice.
      </p>
      <h2>Food data</h2>
      <p>
        Built-in local dishes (nasi lemak, roti canai, chicken rice and more) come from the
        Singapore Health Promotion Board&apos;s SG FoodID database; basic ingredients come from USDA
        FoodData Central (SR Legacy, public domain). Each item shows its source ID. Custom foods are
        entered by you from food labels and only you can see them.
      </p>
      <h2>AI photo calories</h2>
      <p>
        Photos are analysed by AI vision models (Google Gemini free tier; when busy, backup models
        are tried in turn, ending with Cloudflare Workers AI). The AI lists each food and estimates
        its weight in grams; an optional note you type (for example &quot;half rice&quot;) is sent
        with the photo. If a food matches a dish in the database above, its calories use the
        database&apos;s lab values and only the amount comes from the AI; other foods use the
        AI&apos;s estimate. Impossible numbers are removed (for example more nutrients than the food
        weighs), and calories are checked against protein, carbs and fat (4/4/9 kcal/g). Portion
        estimates from photos can be 20–30% off, so please check and adjust each time.
      </p>
      <p>
        <Link to="/legal/credits" className="underline">
          Data sources
        </Link>
      </p>
    </InfoPage>
  );
}

export function Disclaimer() {
  return (
    <InfoPage title="Health disclaimer" updated="2026-10-15">
      <p>
        EatHealthee is a health and lifestyle tool. It is not a medical device and does not provide
        medical diagnosis, treatment or prescriptions.
      </p>
      <ul>
        <li>
          All calorie, nutrient and water guidance is an estimate based on published formulas and
          the details you provide, and may differ from your actual needs.
        </li>
        <li>
          If you have any medical condition, are pregnant or breastfeeding, take medicine that
          affects weight or blood sugar, or have had an eating disorder, talk to a doctor or
          registered dietitian before changing your diet or exercise.
        </li>
        <li>This service is only for people aged 18 or over.</li>
      </ul>
      <p>
        This document is a draft and will be reviewed by a legal professional before public launch.
      </p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage title="Privacy policy" updated="2026-10-15">
      <p>This policy explains how the current version of EatHealthee handles your data.</p>
      <h2>What we collect</h2>
      <p>
        What you enter during setup and use: date of birth, height, weight, waist, goal, activity
        level, health screening answers, diet preferences, food logs and weight logs. Under
        Malaysia&apos;s Personal Data Protection Act 2010 (PDPA), health data is sensitive personal
        data, and we only use it with your explicit consent.
      </p>
      <h2>Where your data is stored</h2>
      <p>
        <strong>Without an account:</strong> everything stays in this device&apos;s browser and is
        never sent to a server. Clearing browser data, private browsing or changing devices will
        lose it.
      </p>
      <p>
        <strong>With an account:</strong> your data is sent over an encrypted connection (HTTPS) to
        your account, stored for us by our database provider Supabase on servers in Singapore.
        Access rules mean each account can only read and write its own data. A copy is also kept on
        your device so you can use the app offline. You are asked for explicit consent to this when
        you sign up.
      </p>
      <p>
        <strong>AI photos:</strong> only after you take a photo and agree, the photo is shrunk on
        your phone (removing location and other metadata) and passed through our server to Google
        Gemini or Cloudflare Workers AI for analysis, together with any note you typed. Our servers
        do not keep photos; a small thumbnail stays only in your browser so your food log can show
        it, and is deleted when you delete your data. We keep the food entries you confirm.
        Google&apos;s free-tier terms allow Google to use uploads to improve its products, so please
        keep faces and personal details out of the shot. To share the free quota fairly, we record
        how many photos each account uses per day (not the photos themselves).
      </p>
      <h2>How we use it</h2>
      <p>
        Only to calculate calorie targets, nutrition guidance, trends and insights, and to sync
        between your devices. We do not sell data or use advertising trackers.
      </p>
      <h2>Your rights</h2>
      <ul>
        <li>View and change your data at any time on the Me page.</li>
        <li>Export all your data (JSON) at any time.</li>
        <li>
          Delete all health records at any time (your account and plan stay); when logged in, they
          are deleted from the cloud too.
        </li>
        <li>
          Permanently delete your account at any time: your login email, password, all cloud data
          and photo-count records are deleted together and cannot be recovered.
        </li>
      </ul>
      <h2>Changes</h2>
      <p>If this policy changes in an important way, we will tell you in the app.</p>
      <p>
        This document is a draft and will be reviewed by a legal professional under the PDPA before
        public launch.
      </p>
    </InfoPage>
  );
}

export function Credits() {
  return (
    <InfoPage title="Data sources" updated="2026-10-15">
      <h2>Local dish nutrition</h2>
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
        Nutrition values for local dishes are taken unchanged from SG FoodID; the display names and
        serving buttons were added by us. Recipes and portions in Singapore and Malaysia may differ.
      </p>
      <h2>Basic ingredient nutrition</h2>
      <p>U.S. Department of Agriculture, FoodData Central (SR Legacy), public domain (CC0).</p>
    </InfoPage>
  );
}

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'How is my daily calorie target worked out?',
    a: (
      <>
        The Mifflin–St Jeor equation gives your basal metabolism, an activity factor turns that into
        daily burn, and your goal and pace add or subtract from it, never going below a safety
        floor. See{' '}
        <Link
          to="/how-we-calculate"
          className="font-semibold text-emerald-strong dark:text-emerald"
        >
          How we calculate
        </Link>{' '}
        for the steps; your own numbers are in Me → Daily nutrition targets.
      </>
    ),
  },
  {
    q: 'Why does my weight go up and down every day?',
    a: 'Water, salt, portion size, digestion and hormonal cycles can move your weight 1–2 kg in a day. That is why Progress uses a smoothed trend line to show long-term change.',
  },
  {
    q: 'What is a "complete day"? Do I have to tick it?',
    a: 'When you have logged everything you ate in a day, tick "I logged everything I ate this day" at the bottom of the Diary. Only those complete days are used to check calories against your target and to suggest target changes, so half-logged days do not skew the results. You can use the app without ticking it.',
  },
  {
    q: 'How accurate are AI photo estimates?',
    a: 'The AI first identifies each food. When it matches our database (Singapore SG FoodID, USDA), the database values are used; otherwise the AI estimates. Portions and hidden oil or sugar are hard to see in a photo, so check and adjust amounts before saving. Typing a short note before you snap (for example "half rice") helps. Each account can analyse 20 photos a day.',
  },
  {
    q: 'When do target suggestions appear?',
    a: 'From 14 days after you start a goal, if the last 3 weeks have enough complete days and weigh-ins, we estimate what you really burn from your intake and weight trend and suggest a new target. It only changes if you tap "Use suggestion".',
  },
  {
    q: 'Why are there no reminders?',
    a: "EatHealthee does not have push notifications yet and never sends reminders in the background. You can use your phone's alarm or reminders app at mealtimes.",
  },
  {
    q: 'Is my data still there when numbers are hidden?',
    a: 'Yes. Hiding numbers only removes calories and weight from the screen. Your data is still saved, synced and exported as normal.',
  },
  {
    q: 'Where is my data stored? Will I lose it if I change phones?',
    a: "With an account, your data syncs to it, so logging in on a new phone brings it back. Without an account, it stays only in this device's browser.",
  },
  {
    q: 'How do I delete my data or account?',
    a: 'Delete single food or weight entries in the Diary and in Progress → Weight log. To delete all health records or your whole account, go to Me → Privacy & data or Account & security. Account deletion cannot be undone, so export a backup first.',
  },
];

export function Faq() {
  return (
    <InfoPage title="FAQ" updated="2026-10-15">
      {FAQ.map((f) => (
        <details
          key={f.q}
          className="group border-b border-slate-100 pb-3 last:border-0 dark:border-slate-700"
        >
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-semibold">
            {f.q}
            <span aria-hidden="true" className="text-slate-400 transition group-open:rotate-90">
              ›
            </span>
          </summary>
          <p className="text-slate-700 dark:text-slate-200">{f.a}</p>
        </details>
      ))}
    </InfoPage>
  );
}
