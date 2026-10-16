import { FORMULA_VERSION } from '@fittrack/engine';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BackButton, Card } from '../components/ui';
import { SG_FOODID_ACCESSED, SG_FOODID_URL } from '../data/foodsSg';
import { t } from '../lib/i18n';

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
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t('Last updated:')} {updated}
        </p>
      )}
      <Card className="space-y-4 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </Card>
    </div>
  );
}

export function HowWeCalculate() {
  return (
    <InfoPage title={t('How we calculate')} updated="2026-10-15">
      <p>
        {t('Every number comes from published formulas you can check (formula version')}{' '}
        {FORMULA_VERSION}
        {t('). They are estimates, not exact measurements of your body.')}
      </p>
      <h2>{t('Basal metabolic rate (BMR)')}</h2>
      <p>
        {t(
          'We use the Mifflin–St Jeor equation (1990): 10 × weight kg + 6.25 × height cm − 5 × age + s. The male formula uses s = +5 and the female formula s = −161; the neutral option uses their average, −78 (a product choice that may be less precise). For most adults the equation is within about ±10%.',
        )}
      </p>
      <h2>{t('Total daily energy expenditure (TDEE)')}</h2>
      <p>
        {t(
          'BMR × activity factor: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725, extra active 1.9. The factor already includes exercise, so exercise calories are not added back to your budget, which would count them twice.',
        )}
      </p>
      <h2>{t('Daily calorie target')}</h2>
      <ul>
        <li>
          {t(
            'Based on the weekly weight change you choose, using about 7,700 kcal per kg as a starting estimate.',
          )}
        </li>
        <li>
          {t(
            'A fat-loss deficit is at most 25% of TDEE; a weight-gain surplus is at most 500 kcal a day.',
          )}
        </li>
        <li>
          {t(
            'Safety floor: never below your estimated BMR, and never below 1,200 kcal (female formula) or 1,500 kcal (male and neutral). If the floor is above your TDEE, the target is maintenance.',
          )}
        </li>
        <li>
          {t(
            'No fat-loss target when BMI is below 18.5 (Malaysian Ministry of Health Asian cut-off), and no calorie deficit during pregnancy, breastfeeding or with a history of eating disorders.',
          )}
        </li>
      </ul>
      <h2>{t('Macronutrients')}</h2>
      <ul>
        <li>
          {t(
            'Protein per kg of body weight (1.6 g/kg by default for fat loss and muscle gain, 1.4 for weight gain, 1.2 for maintenance). At BMI 27.5 or above, the weight for BMI 25 is used. At most 35% of calories. Fixed at 0.8 g/kg with kidney disease.',
          )}
        </li>
        <li>
          {t(
            'Fat is 25% of calories (range 20–35%); carbs make up the rest, kept at 130 g or more where possible.',
          )}
        </li>
        <li>{t('Energy: protein and carbs 4 kcal/g, fat 9 kcal/g.')}</li>
      </ul>
      <h2>{t('Trend weight and target suggestions')}</h2>
      <p>
        {t(
          'Trend weight is an exponentially weighted moving average of your daily weigh-ins (α = 0.1). With enough data (at least 80% of days fully logged and at least 10 weigh-ins in 3 weeks), we estimate what you really burn from your average intake and trend change, and suggest a change of at most ±150 kcal at a time. You decide whether to accept it.',
        )}
      </p>
      <h2>{t('Water guide')}</h2>
      <p>
        {t(
          'Based on body weight: about 35–40 ml per kg for normal activity, 30–35 ml for mostly sitting in air-conditioning, and 40–45 ml if you are active or sweat a lot (choose with "Adjust" on the Today page). It is a practical guide, not a strict number; drink more in hot weather. With kidney or heart conditions, follow your doctor\'s advice.',
        )}
      </p>
      <h2>{t('Food data')}</h2>
      <p>
        {t(
          "Built-in local dishes (nasi lemak, roti canai, chicken rice and more) come from the Singapore Health Promotion Board's SG FoodID database; basic ingredients come from USDA FoodData Central (SR Legacy, public domain). Each item shows its source ID. Custom foods are entered by you from food labels and only you can see them.",
        )}
      </p>
      <h2>{t('AI photo calories')}</h2>
      <p>
        {t(
          'Photos are analysed by AI vision models (Google Gemini free tier; when busy, backup models are tried in turn, ending with Cloudflare Workers AI). The AI lists each food and estimates its weight in grams; an optional note you type (for example "half rice") is sent with the photo. If a food matches a dish in the database above, its calories use the database\'s lab values and only the amount comes from the AI; other foods use the AI\'s estimate. Impossible numbers are removed (for example more nutrients than the food weighs), and calories are checked against protein, carbs and fat (4/4/9 kcal/g). Portion estimates from photos can be 20–30% off, so please check and adjust each time.',
        )}
      </p>
      <p>
        <Link to="/legal/credits" className="underline">
          {t('Data sources')}
        </Link>
      </p>
    </InfoPage>
  );
}

export function Disclaimer() {
  return (
    <InfoPage title={t('Health disclaimer')} updated="2026-10-15">
      <p>
        {t(
          'EatHealthee is a health and lifestyle tool. It is not a medical device and does not provide medical diagnosis, treatment or prescriptions.',
        )}
      </p>
      <ul>
        <li>
          {t(
            'All calorie, nutrient and water guidance is an estimate based on published formulas and the details you provide, and may differ from your actual needs.',
          )}
        </li>
        <li>
          {t(
            'If you have any medical condition, are pregnant or breastfeeding, take medicine that affects weight or blood sugar, or have had an eating disorder, talk to a doctor or registered dietitian before changing your diet or exercise.',
          )}
        </li>
        <li>{t('This service is only for people aged 18 or over.')}</li>
      </ul>
      <p>
        {t(
          'This document is a draft and will be reviewed by a legal professional before public launch.',
        )}
      </p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage title={t('Privacy policy')} updated="2026-10-15">
      <p>{t('This policy explains how the current version of EatHealthee handles your data.')}</p>
      <h2>{t('What we collect')}</h2>
      <p>
        {t(
          "What you enter during setup and use: date of birth, height, weight, waist, goal, activity level, health screening answers, diet preferences, food logs and weight logs. Under Malaysia's Personal Data Protection Act 2010 (PDPA), health data is sensitive personal data, and we only use it with your explicit consent.",
        )}
      </p>
      <h2>{t('Where your data is stored')}</h2>
      <p>
        <strong>{t('Without an account:')}</strong>{' '}
        {t(
          "everything stays in this device's browser and is never sent to a server. Clearing browser data, private browsing or changing devices will lose it.",
        )}
      </p>
      <p>
        <strong>{t('With an account:')}</strong>{' '}
        {t(
          'your data is sent over an encrypted connection (HTTPS) to your account, stored for us by our database provider Supabase on servers in Singapore. Access rules mean each account can only read and write its own data. A copy is also kept on your device so you can use the app offline. You are asked for explicit consent to this when you sign up.',
        )}
      </p>
      <p>
        <strong>{t('AI photos:')}</strong>{' '}
        {t(
          "only after you take a photo and agree, the photo is shrunk on your phone (removing location and other metadata) and passed through our server to Google Gemini or Cloudflare Workers AI for analysis, together with any note you typed. Our servers do not keep photos; a small thumbnail stays only in your browser so your food log can show it, and is deleted when you delete your data. We keep the food entries you confirm. Google's free-tier terms allow Google to use uploads to improve its products, so please keep faces and personal details out of the shot. To share the free quota fairly, we record how many photos each account uses per day (not the photos themselves).",
        )}
      </p>
      <h2>{t('How we use it')}</h2>
      <p>
        {t(
          'Only to calculate calorie targets, nutrition guidance, trends and insights, and to sync between your devices. We do not sell data or use advertising trackers.',
        )}
      </p>
      <h2>{t('Your rights')}</h2>
      <ul>
        <li>{t('View and change your data at any time on the Me page.')}</li>
        <li>{t('Export all your data (JSON) at any time.')}</li>
        <li>
          {t(
            'Delete all health records at any time (your account and plan stay); when logged in, they are deleted from the cloud too.',
          )}
        </li>
        <li>
          {t(
            'Permanently delete your account at any time: your login email, password, all cloud data and photo-count records are deleted together and cannot be recovered.',
          )}
        </li>
      </ul>
      <h2>{t('Changes')}</h2>
      <p>{t('If this policy changes in an important way, we will tell you in the app.')}</p>
      <p>
        {t(
          'This document is a draft and will be reviewed by a legal professional under the PDPA before public launch.',
        )}
      </p>
    </InfoPage>
  );
}

export function Credits() {
  return (
    <InfoPage title={t('Data sources')} updated="2026-10-15">
      <h2>{t('Local dish nutrition')}</h2>
      <p>
        {t(
          'Contains information from the Singapore Food Insights Database (SG FoodID), Health Promotion Board, accessed on',
        )}{' '}
        {SG_FOODID_ACCESSED}
        {t(', which is made available under the terms of the SG FoodID Terms of Use:')}{' '}
        <a href={SG_FOODID_URL} className="break-all underline" target="_blank" rel="noreferrer">
          {SG_FOODID_URL}
        </a>
        {t(
          '. The information is provided "as is" without warranty. EatHealthee is not endorsed by or affiliated with the Health Promotion Board.',
        )}
      </p>
      <p>
        {t(
          'Nutrition values for local dishes are taken unchanged from SG FoodID; the display names and serving buttons were added by us. Recipes and portions in Singapore and Malaysia may differ.',
        )}
      </p>
      <h2>{t('Basic ingredient nutrition')}</h2>
      <p>
        {t('U.S. Department of Agriculture, FoodData Central (SR Legacy), public domain (CC0).')}
      </p>
    </InfoPage>
  );
}

/** Built when shown, so it follows the chosen language. */
function faq(): { q: string; a: ReactNode }[] {
  return [
    {
      q: t('How is my daily calorie target worked out?'),
      a: (
        <>
          {t(
            'The Mifflin–St Jeor equation gives your basal metabolism, an activity factor turns that into daily burn, and your goal and pace add or subtract from it, never going below a safety floor. See',
          )}{' '}
          <Link
            to="/how-we-calculate"
            className="font-semibold text-emerald-strong dark:text-emerald"
          >
            {t('How we calculate')}
          </Link>{' '}
          {t('for the steps; your own numbers are in Me → Daily nutrition targets.')}
        </>
      ),
    },
    {
      q: t('Why does my weight go up and down every day?'),
      a: t(
        'Water, salt, portion size, digestion and hormonal cycles can move your weight 1–2 kg in a day. That is why Progress uses a smoothed trend line to show long-term change.',
      ),
    },
    {
      q: t('What is a "complete day"? Do I need to do anything?'),
      a: t(
        'No. Once a day is over, it counts as complete if you logged food that day. If a day has much less than you usually eat (under half), the app asks whether you ate less or forgot some food. Days with forgotten food are left out of target checks, so half-logged days do not pull your target down.',
      ),
    },
    {
      q: t('How accurate are AI photo estimates?'),
      a: t(
        'The AI first identifies each food. When it matches our database (Singapore SG FoodID, USDA), the database values are used; otherwise the AI estimates. Portions and hidden oil or sugar are hard to see in a photo, so check and adjust amounts before saving. Typing a short note before you snap (for example "half rice") helps.',
      ),
    },
    {
      q: t('When do target suggestions appear?'),
      a: t(
        'From 14 days after you start a goal, if the last 3 weeks have enough complete days and weigh-ins, we estimate what you really burn from your intake and weight trend and suggest a new target. It only changes if you tap "Use suggestion".',
      ),
    },
    {
      q: t('Can the app remind me to log?'),
      a: t(
        "Yes. In Me → Reminders, choose the times you want and tap Add to my calendar. The reminders go into your phone's own calendar, so you can change or remove them there.",
      ),
    },
    {
      q: t('Is my data still there when numbers are hidden?'),
      a: t(
        'Yes. Hiding numbers only removes calories and weight from the screen. Your data is still saved, synced and exported as normal.',
      ),
    },
    {
      q: t('Where is my data stored? Will I lose it if I change phones?'),
      a: t(
        "With an account, your data syncs to it, so logging in on a new phone brings it back. Without an account, it stays only in this device's browser.",
      ),
    },
    {
      q: t('How do I delete my data or account?'),
      a: t(
        'Delete single food or weight entries in the Diary and in Progress → Weight log. To delete all your logs, go to Me → Privacy & data. To delete your whole account, tap your name at the top of Me. Account deletion cannot be undone, so export a backup first.',
      ),
    },
  ];
}

export function Faq() {
  return (
    <InfoPage title={t('FAQ')} updated="2026-10-15">
      {faq().map((f) => (
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
