// Simplified Chinese for the English texts in the code (see i18n.tsx).
// Keys are the exact English texts; {name} placeholders must stay the same.
// Units (kcal, kg, g, ml, cm) are kept as they are, as Malaysian apps usually do.
export const ZH: Record<string, string> = {
  // Navigation and dates
  Today: '今天',
  Yesterday: '昨天',
  Diary: '日记',
  'Main menu': '主菜单',
  "This browser can't save data (maybe private browsing). Your logs will be lost when you close the page.":
    '这个浏览器无法保存数据（可能是无痕模式）。关闭页面后，你的记录会消失。',
  Progress: '进度',
  Me: '我的',
  January: '一月',
  February: '二月',
  March: '三月',
  April: '四月',
  May: '五月',
  June: '六月',
  July: '七月',
  August: '八月',
  September: '九月',
  October: '十月',
  November: '十一月',
  December: '十二月',

  // Progress
  Optional: '选填',
  Updated: '已更新',
  Now: '现在',
  'Not set': '未设定',
  Maintain: '维持',
  'Weight log': '体重记录',
  "How your week went, your weight and what you've achieved.": '这周的情况、你的体重和你的成就。',
  "🙈 You've hidden calorie and weight numbers, so only habits and logging are shown. Turn them back on in":
    '🙈 你已隐藏卡路里和体重数字，所以这里只显示习惯和记录情况。可以在这里重新打开：',
  'Chart range': '图表范围',
  '{r} days': '{r} 天',
  'Your weight': '你的体重',
  'Log your first weight to start seeing changes.': '记录第一次体重，就能开始看到变化。',
  'Weigh in the morning, after the toilet and before breakfast, for the most accurate reading.':
    '早上上完厕所、吃早餐前称重最准确。',
  '+ Log weight': '+ 记录体重',
  Start: '开始',
  Latest: '最新',
  Goal: '目标',
  '· 🎉 Goal weight reached': '· 🎉 已达到目标体重',
  'kg to go': 'kg 待完成',
  'Latest weigh-in:': '最近一次称重：',
  'Log one more weigh-in to draw your trend.': '再记录一次体重，就能画出你的趋势。',
  'Weight moves a little every day. Watch the direction over a few weeks.':
    '体重每天都会有一点起伏，看几周的整体方向就好。',
  'Tips for you': '给你的建议',
  'Based on your last 7 days': '根据你最近 7 天',
  'Hidden for this week': '本周已隐藏',
  'Hide this week': '本周隐藏',
  'Show less': '收起',
  'See {n} more tip': '再看 {n} 条建议',
  'See {n} more tips': '再看 {n} 条建议',
  'Tips come from simple rules applied to your own logs. They are not medical advice; for health concerns, talk to a doctor or dietitian.':
    '建议是根据你自己的记录，用简单规则得出的，不是医疗意见。有健康疑虑，请咨询医生或营养师。',
  '✓ Based on your logs from {from} – {to}, your current target of {kcal} kcal fits. No change needed.':
    '✓ 根据你 {from} – {to} 的记录，目前 {kcal} kcal 的目标很合适，不需要更改。',
  Suggested: '建议',
  'kcal / day': 'kcal / 天',
  'From {from} – {to} ({days} days), your complete days averaged {intake} kcal and your trend weight changed {change} kg. That suggests you burn about {tdee} kcal, so we suggest raising your target.':
    '{from} – {to}（{days} 天）里，你完整记录的日子平均摄取 {intake} kcal，趋势体重变化了 {change} kg。这表示你每天大约消耗 {tdee} kcal，所以我们建议调高你的目标。',
  'From {from} – {to} ({days} days), your complete days averaged {intake} kcal and your trend weight changed {change} kg. That suggests you burn about {tdee} kcal, so we suggest lowering your target.':
    '{from} – {to}（{days} 天）里，你完整记录的日子平均摄取 {intake} kcal，趋势体重变化了 {change} kg。这表示你每天大约消耗 {tdee} kcal，所以我们建议调低你的目标。',
  'This is an estimate: missed foods, water changes or hormonal cycles all affect it.':
    '这是估算值：漏记的食物、身体水分变化或荷尔蒙周期都会影响它。',
  "It is set at your safety floor of {v1} kcal and won't go lower. ":
    '它已设在你的安全下限 {v1} kcal，不会再更低。',
  'Your target only changes if you tap "Use suggestion", and the old one stays in your history.':
    '只有你按「使用建议」，目标才会改变；旧的目标会保留在历史记录里。',
  'Done. Your new daily target is {v1} kcal': '完成。你新的每日目标是 {v1} kcal',
  'Use suggestion': '使用建议',
  "Target kept. We'll review again in two weeks.": '已保留目标。我们两周后会再检查一次。',
  'Keep current target': '保留现在的目标',
  'Calorie target check': '卡路里目标检查',
  'Is your daily calorie target right for you?': '你的每日卡路里目标适合你吗？',
  'All your weigh-ins': '你所有的称重记录',
  "Today's weight goes on the": '今天的体重可以在这里记录：',
  'Today page ›': '今天页面 ›',
  'Weight saved for {v1}': '已保存 {v1} 的体重',
  'Edit weigh-in': '编辑称重',
  'Add a past weigh-in': '补记以前的体重',
  Waist: '腰围',
  'This day already has a weigh-in; saving will replace it.':
    '这一天已经有体重记录，保存后会取代它。',
  'Save changes': '保存更改',
  '+ Add a past weigh-in': '+ 补记以前的体重',
  'No weigh-ins yet.': '还没有称重记录。',
  cm: 'cm',
  'Edit weight for {date}': '编辑 {date} 的体重',
  'Delete weigh-in for {date}': '删除 {date} 的称重',
  'Deleted weigh-in for {v1}': '已删除 {v1} 的称重',
  'Show all {length}': '显示全部 {length} 条',
  'Daily target history is in': '每日目标的历史记录在',
  'Me → Daily nutrition targets': '我的 → 每日营养目标',

  // Onboarding
  EatHealthee: 'EatHealthee',
  Back: '返回',
  'Get started': '开始使用',
  'health disclaimer': '健康免责声明',
  and: '和',
  'privacy policy': '隐私政策',
  Next: '下一步',
  'Date of birth': '出生日期',
  'about {v1} kg a week': '每周约 {v1} kg',
  'Pregnant or breastfeeding': '怀孕或哺乳中',
  'Kidney disease': '肾脏疾病',
  "EatHealthee helps you lose fat, gain weight, build muscle or maintain, safely and in a way that fits your life. You don't need a gym to start.":
    'EatHealthee 帮你用适合自己生活的方式，安全地减脂、增重、增肌或维持体重。不用去健身房也能开始。',
  "You're logged in: your data is saved to your account over an encrypted connection (server in Singapore). You'll see it on any device, and only you can access it.":
    '你已登录：你的数据会通过加密连接保存到你的账号（服务器在新加坡）。在任何设备上都能看到，而且只有你能查看。',
  "You're not logged in: your data stays in this device's browser only. You can sign up later from the Me page to back it up to an account.":
    '你还没登录：你的数据只保存在这部设备的浏览器里。之后可以在「我的」页面注册，把数据备份到账号。',
  "I'm 18 or older and have read and accept the": '我已年满 18 岁，并已阅读和接受',
  'I agree that EatHealthee may use the body and health details I give to work out its advice':
    '我同意 EatHealthee 使用我提供的身体和健康资料来计算建议',
  'Height (cm)': '身高（cm）',
  'Weight (kg)': '体重（kg）',
  'Diagnosed with, or being treated for, an eating disorder': '被诊断有饮食失调，或正在接受治疗',
  "Your protein target will be fixed at 0.8 g per kg. Please follow your doctor's or dietitian's advice.":
    '你的蛋白质目标会固定为每公斤 0.8 g。请遵从医生或营养师的建议。',
  '{r}% of body weight a week': '每周体重的 {r}%',
  'Target weight (kg)': '目标体重（kg）',
  'Target weight must be below your current weight.': '目标体重必须低于你现在的体重。',
  'Target weight must be above your current weight.': '目标体重必须高于你现在的体重。',
  'Change goal': '更改目标',
  'None of these': '以上都没有',
  'No restrictions': '没有限制',
  Skip: '跳过',

  // Today
  'Log food': '记录饮食',
  kg: 'kg',
  Close: '关闭',
  Cancel: '取消',
  'Weight must be 30 to 300 kg.': '体重必须在 30 到 300 kg 之间。',
  'Weigh-in': '称重',
  Weight: '体重',
  kcal: 'kcal',
  Save: '保存',
  'Weight must be 30–300 kg.': '体重必须在 30–300 kg 之间。',
  Edit: '编辑',
  Underweight: '偏瘦',
  Healthy: '健康',
  Overweight: '超重',
  Obese: '肥胖',
  'Up late': '夜深了',
  'Good morning': '早上好',
  'Good afternoon': '下午好',
  'Good evening': '晚上好',
  ', {name}': '，{name}',
  'One small step at a time.': '一步一步来。',
  'Your weight trend has moved 2 kg or more': '你的体重趋势已变化 2 kg 或以上',
  'You can recalculate your daily target from your latest trend weight.':
    '你可以根据最新的趋势体重，重新计算每日目标。',
  'Recalculate target': '重新计算目标',
  'Calories today': '今日卡路里',
  '{n} item logged': '已记录 {n} 项',
  '{n} items logged': '已记录 {n} 项',
  "Today's meals": '今天的餐点',
  'View all →': '查看全部 →',
  'Nothing logged yet today. Snap or search your first meal.':
    '今天还没有记录。拍照或搜索你的第一餐吧。',
  Nutrition: '营养',
  'History →': '历史 →',
  BMI: 'BMI',
  'Goal reached! 🎉': '已达成目标！🎉',
  '{n} kg to go': '还差 {n} kg',
  'Set a target weight': '设定目标体重',
  '✓ Weighed today': '✓ 今天已称重',
  "Today's weigh-in": '今天的体重',
  'Decrease by 0.1 kg': '减少 0.1 kg',
  'Increase by 0.1 kg': '增加 0.1 kg',
  'Most accurate in the morning, after the toilet and before eating.':
    '早上上完厕所、吃东西前称最准确。',
  "Log today's weight": '记录今天的体重',
  'Most accurate in the morning, after the toilet and before eating':
    '早上上完厕所、吃东西前称最准确',
  "Today's weight (kg)": '今天的体重（kg）',
  'BMI (height {h} cm)': 'BMI（身高 {h} cm）',
  'Save weight': '保存体重',
  'Change your height in Me → Profile': '可以在「我的 → 个人资料」更改身高',

  // Camera
  'Snap your food': '拍下你的食物',
  'Close camera': '关闭相机',
  'AI food snap': 'AI 拍照识别',
  'Fit the whole meal in, with the plate if you can': '把整份餐点拍进去，最好连盘子一起',
  'Opening the camera…': '正在打开相机…',
  "Can't open the camera here (camera permission may be off). Use the button below to take a photo, or pick one from your album.":
    '这里打不开相机（可能没开相机权限）。请用下面的按钮拍照，或从相册选一张。',
  '📸 Use the phone camera': '📸 使用手机相机',
  'What is it? (optional)': '这是什么？（选填）',
  'What is it? (optional) e.g. kopi O, half rice': '这是什么？（选填）例如：kopi O、半碗饭',
  'Clear note': '清除备注',
  'Quick notes': '快速备注',
  Album: '相册',
  'Take photo': '拍照',
  Manual: '手动',

  // Diary
  Meal: '餐别',
  '(optional)': '（选填）',
  Amount: '分量',
  'Must be 1 to 5000 g': '必须在 1 到 5000 g 之间',
  Name: '名称',
  'Food diary': '饮食日记',
  'Previous day': '前一天',
  Previous: '上一个',
  'Choose a date, now {v1}': '选择日期，目前是 {v1}',
  'Next day': '后一天',
  'Back to today': '回到今天',
  Eaten: '已吃',
  '/ {v1} kcal': '/ {v1} kcal',
  'Nothing logged': '还没有记录',
  '{n} item': '{n} 项',
  '{n} items': '{n} 项',
  '{n} item · {kcal} kcal': '{n} 项 · {kcal} kcal',
  '{n} items · {kcal} kcal': '{n} 项 · {kcal} kcal',
  'Add to {v1}': '加到{v1}',
  Add: '添加',
  'Done for the day?': '今天记录完了吗？',
  'Tick this when every meal is logged. Only complete days are used to check what you really burn and to suggest target changes.':
    '每一餐都记录好后请打勾。只有完整记录的日子，才会用来计算你真正的消耗和建议调整目标。',
  'I logged everything I ate this day': '我已记录这一天吃的所有东西',
  'Deleted {name}': '已删除 {name}',
  'Edit {name}': '编辑 {name}',
  'About {v1} kcal': '约 {v1} kcal',
  'e.g. tea time': '例如：下午茶',
  Delete: '删除',

  // Charts and calendar
  'No weigh-ins in this period. Try a longer range.': '这段时间没有称重记录。试试更长的范围。',
  'Weight and trend chart': '体重和趋势图',
  '{v1} weight {v2} kg, trend {v3} kg': '{v1} 体重 {v2} kg，趋势 {v3} kg',
  Trend: '趋势',
  'Previous month': '上个月',
  'Next month': '下个月',
  Logged: '已记录',
  'Complete day': '完整记录日',

  // This week
  'Not logged': '未记录',
  'Previous week': '上一周',
  'Next week': '下一周',
  'You logged food on {days}': '你记录了饮食的日子：{days}',
  '{n} of {total} day': '{total} 天中的 {n} 天',
  '{n} of {total} days': '{total} 天中的 {n} 天',
  '{v1} kcal': '{v1} kcal',
  'not logged': '未记录',
  'Average calories a day': '每天平均卡路里',
  'Average protein a day': '每天平均蛋白质',
  'Weigh in twice in a week to see it': '一周称重两次就能看到',
  "Averages only count days you logged food; days you skipped don't count as 0.":
    '平均值只计算有记录饮食的日子；没记录的日子不会当作 0。',

  // Medals
  'Next ({tier}): {goal}': '下一级（{tier}）：{goal}',
  "You're at {value} / {goal} {unit}": '目前进度 {value} / {goal} {unit}',
  'All levels earned 🎉 ({goal})': '已获得所有等级 🎉（{goal}）',
  '{v1} earned': '已获得 {v1}',
  'Not earned yet': '还没获得',
  Achievements: '成就',
  '{v1} medals earned': '已获得 {v1} 枚奖章',
  "Your first medal: {title}, {goal} {unit}. You're at {value}.":
    '你的第一枚奖章：{title}，{goal} {unit}。目前是 {value}。',
  'Log food to earn your first medal.': '记录饮食，赢取你的第一枚奖章。',
  'Trophy case': '奖杯柜',
  Challenge: '挑战',
  'Monthly challenge': '每月挑战',
  '{month} Logging Challenge': '{month}记录挑战',
  'Log food on': '本月在',
  'days this month.': '天记录饮食。',
  '✓ Completed on {v1}': '✓ 于 {v1} 完成',
  '{value} / {goal} days · {daysLeft} day left': '{value} / {goal} 天 · 还剩 {daysLeft} 天',
  '{value} / {goal} days · {daysLeft} days left': '{value} / {goal} 天 · 还剩 {daysLeft} 天',
  'Not enough days left to finish this month, but every day logged still counts.':
    '这个月剩下的天数不够完成挑战了，但每一天的记录依然有意义。',
  'Joined! Your trophy is in the trophy case.': '已参加！你的奖杯在奖杯柜里。',
  'Join and claim trophy': '参加并领取奖杯',
  'Joined the {month} challenge': '已参加{month}挑战',
  'Join challenge': '参加挑战',
  'Personal records': '个人纪录',
  'Log a few days to set your first records.': '记录几天，就能创下你的第一个纪录。',
  'Week of {v1}': '{v1} 那一周',
  NEW: '新',
  Recent: '最近',
  'Hide all medals': '收起所有奖章',
  'All medals': '所有奖章',
  'days in a row': '天（连续）',
  Bronze: '铜牌',
  Silver: '银牌',
  Gold: '金牌',
  Platinum: '白金',
  'Logging streak': '连续记录',
  'Log food {n} days in a row': '连续 {n} 天记录饮食',
  'Days logged': '记录天数',
  days: '天',
  'Log food on {n} day': '记录饮食 {n} 天',
  'Log food on {n} days': '记录饮食 {n} 天',
  'Complete days': '完整记录日',
  'Log everything you ate on {n} day': '完整记录 {n} 天吃的所有东西',
  'Log everything you ate on {n} days': '完整记录 {n} 天吃的所有东西',
  'Protein days': '蛋白质达标日',
  'days on target': '天达标',
  'Reach your protein target on {n} day': '蛋白质达标 {n} 天',
  'Reach your protein target on {n} days': '蛋白质达标 {n} 天',
  'Weigh-ins': '称重',
  'Weigh yourself on {n} day': '称重 {n} 天',
  'Weigh yourself on {n} days': '称重 {n} 天',
  'Toward your goal': '迈向目标',
  '% of the way': '% 的进度',
  'Reach your goal weight of {kg} kg': '达到 {kg} kg 的目标体重',
  'Get {pct}% of the way to {kg} kg ({part} kg lost)':
    '完成迈向 {kg} kg 的 {pct}%（减了 {part} kg）',
  'Get {pct}% of the way to {kg} kg ({part} kg gained)':
    '完成迈向 {kg} kg 的 {pct}%（增了 {part} kg）',
  'Weight lost': '已减体重',
  'Weight gained': '已增体重',
  'Lose {n} kg': '减 {n} kg',
  'Gain {n} kg': '增 {n} kg',
  'Longest streak of days logged': '最长连续记录天数',
  '{n} days': '{n} 天',
  'Most days logged in a month': '一个月内最多记录天数',
  'Lowest weigh-in': '最低体重',
  'Highest weigh-in': '最高体重',
  'Reached your goal weight': '达到了目标体重',
  '{v1} challenge complete': '完成{v1}挑战',

  // Report
  target: '目标',
  'On track': '达标',
  'Under target': '低于目标',
  'Over target': '超过目标',
  'Weight change': '体重变化',
  Protein: '蛋白质',
  Target: '目标',
  Carbs: '碳水',
  Fat: '脂肪',
  '{v1} kg': '{v1} kg',
  Date: '日期',
  'Last 30 days': '最近 30 天',
  'Last 90 days': '最近 90 天',
  Everything: '全部',
  'Calories per day': '每天卡路里',
  'No weigh-ins in this period.': '这段时间没有称重记录。',
  'Data file download started': '数据文件开始下载',
  'Your report': '你的报告',
  '30 days fit on one page. Tap Save as PDF, then choose "Save as PDF" (on iPhone: tap Share, then Save to Files).':
    '30 天的内容刚好一页。按「保存为 PDF」，再选择「Save as PDF」（iPhone：按分享，再选「存储到文件」）。',
  Period: '期间',
  'Extra pages': '附加页面',
  'Include each food I ate': '包括我吃的每样食物',
  'Adds a food list after the summary page': '在总结页后面加上食物清单',
  'Save as PDF': '保存为 PDF',
  'EatHealthee report': 'EatHealthee 报告',
  'kcal/day': 'kcal/天',
  'Days with food logged': '有记录饮食的天数',
  'Average calories': '平均卡路里',
  'Average protein': '平均蛋白质',
  'Average a day vs target': '每天平均 vs 目标',
  'Day by day': '每日明细',
  'Food you ate': '你吃过的食物',
  'No food logged in this period.': '这段时间没有饮食记录。',
  'Download the raw data file instead (JSON, for backups)':
    '改为下载原始数据文件（JSON，用于备份）',

  // Form controls
  'Hide password': '隐藏密码',
  'Show password': '显示密码',
  'you@example.com': 'you@example.com',
  'At least 8 characters': '至少 8 个字符',
  'Too short': '太短',
  OK: '还可以',
  Strong: '强',
  'Password: {v1}': '密码强度：{v1}',
  'Decrease {label}': '减少{label}',
  'Increase {label}': '增加{label}',

  // Water
  'Daily water guide': '每日喝水建议',
  "You have a kidney condition, so please follow your doctor's advice on how much to drink.":
    '你有肾脏问题，喝多少水请遵从医生的建议。',
  Water: '喝水',
  Adjust: '调整',
  'mugs a day': '杯／天',
  'ml, based on': 'ml，依据体重',
  'Water guide settings': '喝水建议设置',
  'Adjust the daily guide to your lifestyle': '按你的生活习惯调整每日建议',
  'Weight used': '使用的体重',
  'Your latest logged weight is used automatically': '会自动使用你最新记录的体重',
  'Activity and environment': '活动量和环境',
  'ml per kg': 'ml／每公斤',
  ml: 'ml',
  '🌿 Sip little and often. No need to count every cup; drink before you feel thirsty.':
    '🌿 少量多次地喝。不用每杯都数，口渴之前就喝。',
  'Update guide': '更新建议',
  'Air-conditioned, mostly sitting': '在冷气房，大多坐着',
  'Normal activity': '一般活动量',
  'Active, outdoors or sweat a lot': '活动多、在户外或很会出汗',

  // AI photo errors
  'Please log in to use AI food snaps (free).': '请登录以使用 AI 拍照识别（免费）。',
  "AI snaps aren't available right now. Please add food manually for now.":
    '现在暂时不能使用 AI 拍照识别。请先手动添加食物。',
  'The AI is busy right now. Try again, or add food manually.':
    'AI 现在很忙。请再试一次，或手动添加食物。',
  'Connection problem. Please check and try again.': '连接有问题。请检查网络后再试。',
  "Can't read this image. Please try another one.": '无法读取这张图片。请换一张试试。',

  // Account errors
  'Wrong email or password.': '电邮或密码错误。',
  'Please click the confirmation link in your email first, then log in.':
    '请先点击电邮里的确认链接，然后再登录。',
  'This email is already registered. Please log in.': '这个电邮已注册过。请直接登录。',
  'Password too weak: use at least 8 characters, mixing letters and numbers.':
    '密码太弱：请使用至少 8 个字符，并混合字母和数字。',
  'Too many emails sent. Please try again later.': '发送的邮件太多了。请稍后再试。',
  'The new password must be different from the old one.': '新密码必须和旧密码不同。',
  "This email address can't be used. Please check it, or try another one.":
    '这个电邮地址无法使用。请检查一下，或换一个试试。',
  "We can't send email to this address yet. Please try again later.":
    '我们暂时无法发送邮件到这个地址。请稍后再试。',
  "We couldn't send the confirmation email. Please try again later.":
    '确认邮件发送失败。请稍后再试。',
  'New sign-ups are closed at the moment.': '目前暂停新用户注册。',
  "Can't reach the server. Please check your connection.": '无法连接服务器。请检查你的网络。',
  'Something went wrong ({code}). Please try again later.': '出了点问题（{code}）。请稍后再试。',
  'Something went wrong. Please try again later.': '出了点问题。请稍后再试。',
  'Delete failed. Check your connection and try again. Your records were not deleted.':
    '删除失败。请检查网络后再试。你的记录没有被删除。',
  'Not logged in.': '还没登录。',
  'Account deletion is not enabled on the server yet. Your account and data were not deleted.':
    '服务器还没开启删除账号功能。你的账号和数据没有被删除。',
  'Delete failed. Check your connection and try again. Your account and data were not deleted.':
    '删除失败。请检查网络后再试。你的账号和数据没有被删除。',

  // Plan labels and messages
  'Female formula': '女性公式',
  'Male formula': '男性公式',
  'Neutral (average of both)': '中性（两者平均）',
  'Maintain weight': '维持体重',
  Sedentary: '久坐',
  'Desk job, little or no exercise': '办公室工作，很少或没有运动',
  'Exercise 1–3 days a week, or a job on your feet': '每周运动 1–3 天，或需要常站着的工作',
  Moderate: '中等',
  'Exercise 3–5 days a week, or a job with lots of walking': '每周运动 3–5 天，或需要常走动的工作',
  'Very active': '很活跃',
  'Exercise 6–7 days a week, or physical work': '每周运动 6–7 天，或体力工作',
  'Extra active': '非常活跃',
  'Physical work plus daily training': '体力工作，加上每天训练',
  'No exercise yet': '暂时不运动',
  'Start with food and habits': '先从饮食和习惯开始',
  'Home workouts': '在家运动',
  'No equipment needed': '不需要器材',
  Gym: '健身房',
  'Using gym equipment': '使用健身器材',
  Outdoors: '户外',
  'Walking, running or cycling': '走路、跑步或骑脚车',
  Mixed: '混合',
  'Flexible, day by day': '每天弹性安排',
  Halal: '清真',
  Vegetarian: '素食',
  'No beef': '不吃牛肉',
  'No pork': '不吃猪肉',
  'The calorie deficit is capped at 25% of your estimated TDEE.':
    '热量缺口最多为你估算 TDEE 的 25%。',
  'Raised to the safety floor of {floor} kcal (never below your estimated BMR, or 1,200 / 1,500 kcal). Progress will be slower than the pace you chose.':
    '已调高到安全下限 {floor} kcal（绝不低于你估算的 BMR，或 1,200 / 1,500 kcal）。进度会比你选择的速度慢。',
  'Your safety floor is above your estimated TDEE, so the target is maintenance for now. Try adding daily activity, or talk to a dietitian.':
    '你的安全下限高于估算的 TDEE，所以目前的目标是维持体重。可以试着增加日常活动，或咨询营养师。',
  'The calorie surplus is capped at 500 kcal a day.': '热量盈余最多为每天 500 kcal。',
  'Protein is capped at 35% of total calories.': '蛋白质最多占总卡路里的 35%。',
  'Fat was lowered (not below 20%) so carbs stay at 130 g or more.':
    '已调低脂肪（不低于 20%），让碳水保持在 130 g 或以上。',
  'The neutral formula averages the male and female versions, so it may be less precise.':
    '中性公式是男性和女性公式的平均值，所以可能没那么准确。',
  'Carbs are below 130 g (the adult recommended intake). Consider adjusting your goal.':
    '碳水低于 130 g（成人建议摄取量）。可以考虑调整你的目标。',
  'Fat loss is not recommended right now': '现在不建议减脂',
  'Your BMI is below 18.5. You can choose "Maintain weight" or "Gain weight" instead.':
    '你的 BMI 低于 18.5。可以改选「维持体重」或「增重」。',
  'Target weight too low': '目标体重太低',
  'This target weight means a BMI below 18.5. Please choose a higher target.':
    '这个目标体重的 BMI 会低于 18.5。请选择更高的目标。',
  'No calorie deficit during pregnancy or breastfeeding': '怀孕或哺乳期间不设热量缺口',
  'Your nutrition needs are different during this time. Please talk to a doctor or registered dietitian first. You can still choose "Maintain weight".':
    '这段时间你的营养需求不一样。请先咨询医生或注册营养师。你仍然可以选择「维持体重」。',
  "For your safety, we don't offer a calorie deficit": '为了你的安全，我们不提供热量缺口',
  'If you need support, please reach out to a healthcare professional. You can still choose "Maintain weight".':
    '如果你需要支持，请联系医疗专业人员。你仍然可以选择「维持体重」。',
  'Enter a valid date of birth; age must be 18 to 100.':
    '请输入正确的出生日期；年龄必须在 18 到 100 岁之间。',
  'Height must be 120 to 230 cm.': '身高必须在 120 到 230 cm 之间。',
  'Please choose a weekly pace.': '请选择每周的速度。',
  'Please check what you entered.': '请检查你输入的内容。',

  // Me
  'Lose fat': '减脂',
  'Build muscle': '增肌',
  'Gain weight': '增重',
  Light: '浅色',
  'Log in': '登录',
  'Sign up': '注册',
  Email: '电邮',
  'Change password': '更改密码',
  'Data sources': '数据来源',
  'Health disclaimer': '健康免责声明',
  'Privacy policy': '隐私政策',
  FAQ: '常见问题',
  'Syncing…': '同步中…',
  '✓ Your logs are synced to your account': '✓ 你的记录已同步到账号',
  "You're offline: logs are saved on this device and sync when you reconnect.":
    '你现在离线：记录会先保存在这部设备，重新连上网络后会同步。',
  'Sync failed. It will retry automatically.': '同步失败，会自动重试。',
  Initial: '初始',
  'Profile update': '资料更新',
  Adjusted: '已调整',
  'Old and new targets': '新旧目标',
  'Update your daily target?': '要更新你的每日目标吗？',
  Item: '项目',
  New: '新',
  'The new target starts today. Past food logs and target history are kept unchanged.':
    '新目标从今天开始。以前的饮食记录和目标历史都不会改变。',
  'Keep current plan': '保留现在的计划',
  'Confirm update': '确认更新',
  'Open the downloaded file to add the reminders to your calendar':
    '打开下载的文件，把提醒加到你的日历',
  Reminders: '提醒',
  "Reminders are added to your phone's calendar (iPhone Calendar, Google Calendar or Outlook). To change or stop them later, edit or delete the EatHealthee events there.":
    '提醒会加到你手机的日历（iPhone 日历、Google 日历或 Outlook）。之后想更改或停止，就在日历里编辑或删除 EatHealthee 的活动。',
  '{label} reminder time': '{label}提醒时间',
  'Add to my calendar': '加到我的日历',
  Saved: '已保存',
  'Updated. Your new daily target is {v1} kcal': '已更新。你新的每日目标是 {v1} kcal',
  'Kept your current plan. Nothing changed.': '已保留现在的计划，没有任何改变。',
  'Preview new daily target': '预览新的每日目标',
  'Your name, picture and account.': '你的名字、头像和账号。',
  'Profile & account': '个人资料与账号',
  Nickname: '昵称',
  'What should we call you?': '我们该怎么称呼你？',
  Picture: '头像',
  Avatar: '头像',
  'Avatar {a}': '头像 {a}',
  Account: '账号',
  'Without an account your data is only on this device. Sign up to back it up and use it on any phone.':
    '没有账号时，你的数据只在这部设备上。注册后就能备份，并在任何手机上使用。',
  'Your logs are synced before logging out, so you can get them back on any device.':
    '登出前会先同步你的记录，所以在任何设备上都能找回。',
  'Logging out…': '正在登出…',
  'Log out': '登出',
  'Permanently delete your account?': '要永久删除你的账号吗？',
  "Your login email, password, all food and weight logs in the cloud, plan and settings will be permanently deleted and can't be recovered. Download your data first if you want a copy (Me → Privacy & data).":
    '你的登录电邮、密码、云端所有的饮食和体重记录、计划和设置都会被永久删除，无法恢复。想保留一份的话，请先下载你的数据（我的 → 隐私与数据）。',
  'Type DELETE to confirm': '输入 DELETE 确认',
  'Deleting…': '正在删除…',
  'Delete account forever': '永久删除账号',
  'Delete account': '删除账号',
  'Used to work out your daily calorie target.': '用来计算你的每日卡路里目标。',
  'Body details': '身体资料',
  Formula: '公式',
  'The calorie formula has a male and a female version; neutral is the average.':
    '卡路里公式有男性和女性两种；中性是两者的平均值。',
  Male: '男性',
  Female: '女性',
  Neutral: '中性',
  Height: '身高',
  'Target weight': '目标体重',
  "Optional. Only used to show your progress; it doesn't change your daily calories.":
    '选填。只用来显示你的进度，不会改变你每日的卡路里。',
  'Must be below your current weight': '必须低于你现在的体重',
  'Must be above your current weight': '必须高于你现在的体重',
  'Current weight': '现在的体重',
  Hidden: '已隐藏',
  'Log weight ›': '记录体重 ›',
  "You'll see old and new targets side by side before anything changes.":
    '更改之前，你会先看到新旧目标的对比。',
  'Goal & lifestyle': '目标与生活方式',
  'Your goal': '你的目标',
  'Eat a little less than you burn': '吃得比消耗的少一点',
  'Keep your weight steady': '让体重保持稳定',
  'More protein, a small surplus': '多一点蛋白质，稍微多吃一些',
  'Eat a little more than you burn': '吃得比消耗的多一点',
  Pace: '速度',
  'A slower pace is easier to keep up and helps you keep muscle.':
    '慢一点比较容易坚持，也有助于保住肌肉。',
  '{r}% · recommended': '{r}% · 推荐',
  '{r}% a week': '每周 {r}%',
  'of body weight a week': '每周体重',
  'How active are you?': '你的活动量有多少？',
  'Count your job and exercise together.': '把工作和运动一起算进去。',
  Health: '健康',
  'Only used to keep our advice safe for you. Tick any that apply.':
    '只用来确保我们的建议对你安全。有的请打勾。',
  'Eating disorder': '饮食失调',
  'diagnosed or in treatment': '已诊断或正在治疗',
  Diet: '饮食习惯',
  'Manage your health plan and app settings.': '管理你的健康计划和应用设置。',
  'Edit profile': '编辑个人资料',
  'No nickname yet': '还没有昵称',
  Guest: '访客',
  'Not logged in': '未登录',
  ' · {v1} kcal a day': ' · 每天 {v1} kcal',
  'My health plan': '我的健康计划',
  'Height {heightCm} cm · born {birthDate}{v3}': '身高 {heightCm} cm · 出生于 {birthDate}{v3}',
  'Daily nutrition targets': '每日营养目标',
  "{v1} kcal · protein {proteinG} g · how it's worked out":
    '{v1} kcal · 蛋白质 {proteinG} g · 计算方式',
  "How it's worked out, and history": '计算方式和历史记录',
  'Add, edit or delete weigh-ins': '添加、编辑或删除称重记录',
  'Latest {v1} kg': '最新 {v1} kg',
  'No weigh-ins yet': '还没有称重记录',
  Appearance: '外观',
  Language: '语言',
  Theme: '主题',
  Dark: '深色',
  Auto: '自动',
  'match phone': '跟随手机',
  'Privacy on screen': '屏幕隐私',
  'If the numbers stress you out, or someone can see your screen. You still log as usual; the app shows your habits instead.':
    '如果数字让你有压力，或别人看得到你的屏幕，可以隐藏。你照样记录，应用会改为显示你的习惯。',
  'Hide calories and weight': '隐藏卡路里和体重',
  'Privacy & data': '隐私与数据',
  'Where your data is': '你的数据在哪里',
  'In your account (servers in Singapore) and on this device. Only you can see it.':
    '在你的账号（服务器在新加坡）和这部设备上。只有你能看到。',
  "Only on this device. Sign up so you don't lose it if you change phones.":
    '只在这部设备上。注册账号，换手机时就不会丢失。',
  "This browser can't save data (maybe private browsing).":
    '这个浏览器无法保存数据（可能是无痕模式）。',
  'Download my data': '下载我的数据',
  'A clear report of your logs, saved as PDF': '一份清楚的记录报告，保存为 PDF',
  'Delete all your logs?': '要删除你所有的记录吗？',
  'All food, weight and water logs will be permanently deleted from':
    '所有饮食、体重和喝水记录都会被永久删除，范围：',
  'your account and this device': '你的账号和这部设备',
  'this device': '这部设备',
  ". Your profile and plan stay. This can't be undone, so download your data first if you want a copy.":
    '。你的个人资料和计划会保留。删除后无法恢复，想保留一份的话，请先下载你的数据。',
  'All logs deleted': '所有记录已删除',
  'Delete logs': '删除记录',
  'Delete all health records': '删除所有健康记录',
  'Delete all my logs': '删除我所有的记录',
  'Start fresh but keep your profile and plan': '重新开始，但保留个人资料和计划',
  'Delete everything on this device?': '要删除这部设备上的所有内容吗？',
  "Your profile, plan and all logs will be permanently deleted, and you'll start again from the welcome page.":
    '你的个人资料、计划和所有记录都会被永久删除，并会从欢迎页重新开始。',
  'Delete everything': '全部删除',
  'Delete everything on this device': '删除这部设备上的所有内容',
  'Logs, profile and plan': '记录、个人资料和计划',
  'To delete your account, tap your name at the top of this page.':
    '要删除账号，请点这个页面最上面的名字。',
  'Help & info': '帮助与资讯',
  'App version': '应用版本',
  'No daily target yet. Please finish setting up your profile first.':
    '还没有每日目标。请先完成个人资料设置。',
  'How your daily target is worked out.': '你的每日目标是怎么算出来的。',
  "You've chosen to hide numbers. This page still shows them because it explains the calculation; go back if you'd rather not see them.":
    '你选择了隐藏数字。这个页面在解释计算方式，所以仍会显示数字；不想看的话，请返回。',
  'In effect from {date} ({reason}), based on a weight of {kg} kg at the time.':
    '从 {date} 起生效（{reason}），依据当时的体重 {kg} kg。',
  'Step by step': '一步一步',
  '① Basal metabolic rate (BMR):': '① 基础代谢率（BMR）：',
  'What your body burns in a day at complete rest, using the Mifflin–St Jeor equation:':
    '身体在完全休息时一天消耗的热量，使用 Mifflin–St Jeor 公式：',
  '10 × weight + 6.25 × height − 5 × age': '10 × 体重 + 6.25 × 身高 − 5 × 年龄',
  'Formula:': '公式：',
  ' (average of the male and female constants)': '（男性和女性常数的平均值）',
  '② Total daily energy expenditure (TDEE):': '② 每日总消耗（TDEE）：',
  'Adjusted from your real intake and weight trend, so it fits you better than the formula alone.':
    '已根据你实际的摄取量和体重趋势调整，比单用公式更适合你。',
  'BMR × activity factor {factor} ({name}).': 'BMR × 活动系数 {factor}（{name}）。',
  '③ Goal adjustment:': '③ 目标调整：',
  '{v1}{v2} kcal': '{v1}{v2} kcal',
  ', about {ratePctPerWeek}% of body weight a week': '，约每周体重的 {ratePctPerWeek}%',
  'The deficit is at most 25% of TDEE.': '热量缺口最多为 TDEE 的 25%。',
  'The surplus is at most 500 kcal a day.': '热量盈余最多为每天 500 kcal。',
  '④ Safety floor:': '④ 安全下限：',
  'Your daily target never goes below your BMR, or below 1,200 (female) / 1,500 (male, neutral) kcal.':
    '你的每日目标绝不会低于你的 BMR，也不会低于 1,200（女性）/ 1,500（男性、中性）kcal。',
  'Adjustments made in this calculation': '这次计算做了的调整',
  'The formula is only a starting point; everyone burns a little differently. Once you have enough logs, Progress → Target suggestion fine-tunes it from your real data.':
    '公式只是起点；每个人的消耗都有点不同。记录够多后，「进度 → 目标建议」会根据你的真实数据微调。',
  'Full method ›': '完整方法 ›',
  'Recalculate with your latest weight': '用最新体重重新计算',
  'Log a weigh-in first to recalculate.': '请先记录体重，才能重新计算。',
  '✓ Your latest weight of {kg} kg gives the same target. No update needed.':
    '✓ 用你最新的体重 {kg} kg 算出来的目标一样，不需要更新。',
  'Your target was set at {then} kg and your latest weight is {now} kg. Preview the old and new targets before deciding.':
    '你的目标是按 {then} kg 设定的，而你最新的体重是 {now} kg。决定前可以先预览新旧目标。',
  'Preview recalculated target': '预览重新计算的目标',
  'Target history': '目标历史',
  '· weight': '· 体重',
  protein: '蛋白质',

  // Reminders (calendar events)
  'Weigh yourself': '称体重',
  'Log your breakfast': '记录早餐',
  'Log your lunch': '记录午餐',
  'Log your dinner': '记录晚餐',

  // Meals and calorie gap
  Breakfast: '早餐',
  Lunch: '午餐',
  Dinner: '晚餐',
  Other: '其他',
  'Still to eat': '还要吃',
  'Target reached, extra': '已达标，多出',
  'Left to eat': '还可以吃',

  // Tips
  Logging: '记录',
  Consistency: '坚持',
  Meals: '餐点',
  'Log a few more days': '多记录几天',
  "With 3 or more days logged, your eating patterns start to show. It doesn't need to be perfect; a rough log is fine.":
    '记录 3 天或以上，就能看出你的饮食习惯。不用很完美，大概记录就可以。',
  'Last 7 days: food logged on {loggedDays} days': '最近 7 天：有 {loggedDays} 天记录饮食',
  "You're logging consistently": '你一直坚持记录',
  "You've logged almost every day recently. That's the most important step to understanding your eating habits.":
    '你最近几乎每天都有记录。这是了解自己饮食习惯最重要的一步。',
  'Tick "I logged everything" in the Diary': '在日记里勾选「我已全部记录」',
  'When a day has all your meals logged, tick "I logged everything I ate this day" at the bottom of the Diary. We use these complete days to check your calories and your target, so half-logged days don\'t throw it off.':
    '当一天的餐点都记录好后，请在日记底部勾选「我已记录这一天吃的所有东西」。我们用这些完整记录的日子来检查你的卡路里和目标，这样只记了一半的日子就不会影响结果。',
  'Last 7 days: food logged on {loggedDays} days, {completeDays} ticked as complete':
    '最近 7 天：有 {loggedDays} 天记录饮食，其中 {completeDays} 天标记为完整',
  'Go to Diary': '前往日记',
  'Protein is often low': '蛋白质常常不够',
  'Try adding a protein to each meal, such as eggs, tofu, fish, chicken or a glass of milk.':
    '试着每餐加一份蛋白质，例如鸡蛋、豆腐、鱼、鸡肉或一杯牛奶。',
  'Last 7 days: you reached {targetProteinG} g on {proteinMetDays} of {proteinJudgedDays} complete days':
    '最近 7 天：在 {proteinJudgedDays} 个完整记录日中，有 {proteinMetDays} 天达到 {targetProteinG} g',
  'Protein is on track': '蛋白质达标',
  'You hit your protein target on most days. Keep it up.':
    '你大部分日子都达到了蛋白质目标，继续保持。',
  'Last 7 days: on target {proteinMetDays} of {proteinJudgedDays} complete days':
    '最近 7 天：{proteinJudgedDays} 个完整记录日中有 {proteinMetDays} 天达标',
  'Last 7 days: about {avg} kcal a day on complete days; your target is {target} kcal':
    '最近 7 天：完整记录日平均每天约 {avg} kcal；你的目标是 {target} kcal',
  'Eating below your safety floor': '吃得低于安全下限',
  'Eating too little for long can leave you tired, make it hard to keep going, and cost muscle. Aim for at least {v1} kcal a day; if you feel unwell, talk to a doctor or dietitian.':
    '长期吃太少会让你疲倦、难以坚持，也会流失肌肉。每天至少吃 {v1} kcal；如果感到不舒服，请咨询医生或营养师。',
  'Often over your calorie target': '常常超过卡路里目标',
  "Look for the meal with the biggest portion or the most oil or sugar, and start there. It doesn't have to be perfect every day.":
    '找出分量最大、或最油最甜的那一餐，从那里开始调整。不用每天都完美。',
  'Not eating enough to gain': '吃得不够多，难以增重',
  'Gaining weight means eating more than you burn. Add a snack, or a little more rice, nuts or milk at meals.':
    '增重需要吃得比消耗的多。可以加一份点心，或每餐多一点饭、坚果或牛奶。',
  'Breakfast is rarely logged': '很少记录早餐',
  "If you usually skip breakfast, that's fine. If you just forget to log it, adding it makes your daily calories more accurate.":
    '如果你平常不吃早餐，没关系。如果只是忘了记录，补上会让每日卡路里更准确。',
  'Breakfast on {breakfast} of {length} logged days (last 7 days)':
    '最近 7 天：{length} 个记录日中有 {breakfast} 天有早餐',
  'Last 14 days: {n} weigh-ins, about {change} kg': '最近 14 天：称重 {n} 次，约 {change} kg',
  'Losing weight quite fast': '体重下降得有点快',
  "Losing more than 1% of body weight a week is hard to keep up and can cost muscle. Check that you're not eating too little.":
    '每周减超过体重的 1% 很难坚持，也可能流失肌肉。请检查你是不是吃得太少。',
  'Your weight is moving toward your goal': '你的体重正朝目标前进',
  "Over the last two weeks your weight has been going the right way. Keep doing what you're doing.":
    '过去两周你的体重一直朝正确的方向走。继续保持现在的做法。',
  'Your weight is steady': '你的体重很稳定',
  "Your weight barely moved in two weeks, so you're eating about what you burn.":
    '两周来你的体重几乎没变，表示你吃的和消耗的差不多。',
  'Little change in the last two weeks': '过去两周变化不大',
  'Water, salt and hormonal cycles all affect weight, so two flat weeks are common. Check your logs are complete before changing anything.':
    '水分、盐分和荷尔蒙周期都会影响体重，所以两周没变化很常见。改变任何东西之前，先确认你的记录是完整的。',
  'A new target suggestion is ready': '新的目标建议已准备好',
  "Based on your recent logs, we worked out a daily target that may suit you better. It's your choice whether to use it.":
    '根据你最近的记录，我们算出了一个可能更适合你的每日目标。要不要用，由你决定。',
  'Based on {windowDays} days of logs': '根据 {windowDays} 天的记录',
  'See suggestion': '查看建议',

  // Add food
  Calories: '卡路里',
  'Enter a food name.': '请输入食物名称。',
  'Calories per 100 g must be 0 to 900 kcal.': '每 100 g 的卡路里必须在 0 到 900 kcal 之间。',
  'Protein, carbs and fat per 100 g must each be 0 to 100 g.':
    '每 100 g 的蛋白质、碳水和脂肪都必须在 0 到 100 g 之间。',
  'Protein, carbs and fat per 100 g cannot add up to more than 100 g.':
    '每 100 g 的蛋白质、碳水和脂肪加起来不能超过 100 g。',
  'Sodium must be 0 to 40,000 mg.': '钠必须在 0 到 40,000 mg 之间。',
  'Last time': '上次',
  'Added to {where}: {name}': '已加到{where}：{name}',
  'For {v1}': '{v1}',
  'Add food': '添加食物',
  'Name this meal': '为这一餐命名',
  'e.g. tea time, supper': '例如：下午茶、宵夜',
  'Source: {sourceRef} (verified)': '来源：{sourceRef}（已核实）',
  'Source: Singapore Health Promotion Board {sourceRef}': '来源：新加坡保健促进局 {sourceRef}',
  'Source: {sourceRef}': '来源：{sourceRef}',
  'Source: your own entry from a food label': '来源：你根据食品标签自己输入',
  '{label}: about {g} g': '{label}：约 {g} g',
  'Add to {where}': '加到{where}',
  'Added {n} item to {where}, about {kcal} kcal': '已加 {n} 项到{where}，约 {kcal} kcal',
  'Added {n} items to {where}, about {kcal} kcal': '已加 {n} 项到{where}，约 {kcal} kcal',
  'Recently eaten': '最近吃过',
  'Enter manually': '手动输入',
  'For packaged food, enter the label values. Most accurate.':
    '包装食品可以输入标签上的数值，最准确。',
  '+ Enter': '+ 输入',
  USDA: 'USDA',
  'SG FoodID': 'SG FoodID',
  Custom: '自定义',
  'AI estimate': 'AI 估算',
  'Snap your whole meal. AI spots each food and estimates the portion and calories; you check before it is logged.':
    '拍下整份餐点。AI 会认出每样食物，估算分量和卡路里；记录之前你可以检查。',
  'AI snaps are free but need an account.': 'AI 拍照识别免费，但需要账号。',
  "Photos are shrunk and sent to Google Gemini (or Cloudflare AI as a backup) for analysis. Our servers don't keep photos (a small thumbnail stays on this device for your food log), but Google's free service may use uploads to improve its products. Please keep faces and personal details out of the shot.":
    '照片会先缩小，再传给 Google Gemini（或备用的 Cloudflare AI）分析。我们的服务器不会保存照片（这部设备会保留一张小缩图，用在你的饮食记录），但 Google 的免费服务可能会用上传的内容改进产品。请不要拍到人脸和个人资料。',
  'I understand, analyse my photo': '我明白了，分析我的照片',
  'I understand, start using AI snaps': '我明白了，开始使用 AI 拍照识别',
  'Your food photo': '你的食物照片',
  'What is it?': '这是什么？',
  'e.g. kopi O, half rice': '例如：kopi O、半碗饭',
  "Telling the AI what the photo can't show makes it more accurate.":
    '告诉 AI 照片看不出来的东西，结果会更准确。',
  'Analyse photo': '分析照片',
  '📸 Take photo': '📸 拍照',
  'AI is identifying your food…': 'AI 正在识别你的食物…',
  'AI is taking a careful look. About 10–30 seconds…': 'AI 正在仔细看，大约 10–30 秒…',
  'Try again': '再试一次',
  'Wrong food or amount? Add a note and re-analyse': '食物或分量不对？加个备注重新分析',
  'e.g. "nasi kandar, only half the rice, no curry" or "kopi O, no sugar". Telling the AI what the photo can\'t show makes it more accurate.':
    '例如「nasi kandar，饭只吃一半，没有咖喱」或「kopi O，无糖」。告诉 AI 照片看不出来的东西，结果会更准确。',
  'Note for the AI': '给 AI 的备注',
  'Re-analyse': '重新分析',
  "This doesn't look like food. Please try another photo.": '这看起来不像食物。请换一张照片试试。',
  "The AI isn't sure. Please check the names and amounts.": 'AI 不太确定。请检查名称和分量。',
  'Include {name}': '包括{name}',
  'Calories from nutrition database': '卡路里来自营养数据库',
  'AI-estimated calories': 'AI 估算的卡路里',
  ' · protein {v1} g · carbs {v2} g · fat {v3} g': ' · 蛋白质 {v1} g · 碳水 {v2} g · 脂肪 {v3} g',
  'AI estimates can be off, mostly on portion size.': 'AI 的估算可能有误差，主要在分量上。',
  'Add to {where} (about {kcal} kcal)': '加到{where}（约 {kcal} kcal）',
  'No matching foods.': '没有相符的食物。',
  'New custom food': '新的自定义食物',
  'Enter the "per 100 g" values from the nutrition label. Only you can see this food.':
    '输入营养标签上「每 100 g」的数值。只有你看得到这个食物。',
  'e.g. Gardenia bread': '例如：Gardenia 面包',
  'Per 100 g': '每 100 g',
  'Please fill in calories, protein, carbs and fat.': '请填写卡路里、蛋白质、碳水和脂肪。',
  'Save and choose': '保存并选择',

  // Plan periods
  'This week': '本周',
  'Last week': '上周',
  'Last 7 days': '最近 7 天',

  // Info pages
  'AI photo calories': 'AI 拍照算卡路里',
  'Last updated:': '最后更新：',
  'Every number comes from published formulas you can check (formula version':
    '每个数字都来自你可以查证的公开公式（公式版本',
  '). They are estimates, not exact measurements of your body.':
    '）。它们是估算值，不是你身体的精确测量。',
  'Basal metabolic rate (BMR)': '基础代谢率（BMR）',
  'We use the Mifflin–St Jeor equation (1990): 10 × weight kg + 6.25 × height cm − 5 × age + s. The male formula uses s = +5 and the female formula s = −161; the neutral option uses their average, −78 (a product choice that may be less precise). For most adults the equation is within about ±10%.':
    '我们使用 Mifflin–St Jeor 公式（1990）：10 × 体重 kg + 6.25 × 身高 cm − 5 × 年龄 + s。男性公式 s = +5，女性公式 s = −161；中性选项使用两者的平均值 −78（这是产品上的选择，可能没那么准确）。对大多数成年人，这个公式的误差约在 ±10% 以内。',
  'Total daily energy expenditure (TDEE)': '每日总消耗（TDEE）',
  'BMR × activity factor: sedentary 1.2, light 1.375, moderate 1.55, very active 1.725, extra active 1.9. The factor already includes exercise, so exercise calories are not added back to your budget, which would count them twice.':
    'BMR × 活动系数：久坐 1.2、轻度 1.375、中等 1.55、很活跃 1.725、非常活跃 1.9。系数已包括运动，所以运动消耗的卡路里不会再加回你的额度，否则会重复计算。',
  'Daily calorie target': '每日卡路里目标',
  'Based on the weekly weight change you choose, using about 7,700 kcal per kg as a starting estimate.':
    '根据你选择的每周体重变化，以每公斤约 7,700 kcal 作为初步估算。',
  'A fat-loss deficit is at most 25% of TDEE; a weight-gain surplus is at most 500 kcal a day.':
    '减脂的热量缺口最多为 TDEE 的 25%；增重的热量盈余最多为每天 500 kcal。',
  'Safety floor: never below your estimated BMR, and never below 1,200 kcal (female formula) or 1,500 kcal (male and neutral). If the floor is above your TDEE, the target is maintenance.':
    '安全下限：绝不低于你估算的 BMR，也绝不低于 1,200 kcal（女性公式）或 1,500 kcal（男性和中性）。如果下限高于你的 TDEE，目标就是维持体重。',
  'No fat-loss target when BMI is below 18.5 (Malaysian Ministry of Health Asian cut-off), and no calorie deficit during pregnancy, breastfeeding or with a history of eating disorders.':
    'BMI 低于 18.5 时不设减脂目标（马来西亚卫生部的亚洲标准），怀孕、哺乳或有饮食失调病史时也不设热量缺口。',
  Macronutrients: '三大营养素',
  'Protein per kg of body weight (1.6 g/kg by default for fat loss and muscle gain, 1.4 for weight gain, 1.2 for maintenance). At BMI 27.5 or above, the weight for BMI 25 is used. At most 35% of calories. Fixed at 0.8 g/kg with kidney disease.':
    '蛋白质按每公斤体重计算（减脂和增肌默认 1.6 g/kg，增重 1.4，维持 1.2）。BMI 27.5 或以上时，改用 BMI 25 对应的体重计算。最多占卡路里的 35%。有肾脏疾病时固定为 0.8 g/kg。',
  'Fat is 25% of calories (range 20–35%); carbs make up the rest, kept at 130 g or more where possible.':
    '脂肪占卡路里的 25%（范围 20–35%）；其余是碳水，尽量保持在 130 g 或以上。',
  'Energy: protein and carbs 4 kcal/g, fat 9 kcal/g.':
    '能量：蛋白质和碳水 4 kcal/g，脂肪 9 kcal/g。',
  'Trend weight and target suggestions': '趋势体重和目标建议',
  'Water guide': '喝水建议',
  'Based on body weight: about 35–40 ml per kg for normal activity, 30–35 ml for mostly sitting in air-conditioning, and 40–45 ml if you are active or sweat a lot (choose with "Adjust" on the Today page). It is a practical guide, not a strict number; drink more in hot weather. With kidney or heart conditions, follow your doctor\'s advice.':
    '根据体重计算：一般活动量每公斤约 35–40 ml，大多坐在冷气房约 30–35 ml，活动多或很会出汗约 40–45 ml（可在今天页面按「调整」选择）。这是实用的参考，不是严格的数字；天气热时请多喝。有肾脏或心脏问题时，请遵从医生的建议。',
  'Food data': '食物数据',
  "Built-in local dishes (nasi lemak, roti canai, chicken rice and more) come from the Singapore Health Promotion Board's SG FoodID database; basic ingredients come from USDA FoodData Central (SR Legacy, public domain). Each item shows its source ID. Custom foods are entered by you from food labels and only you can see them.":
    '内置的本地菜（nasi lemak、roti canai、海南鸡饭等）来自新加坡保健促进局的 SG FoodID 数据库；基本食材来自 USDA FoodData Central（SR Legacy，公共领域）。每一项都会显示来源编号。自定义食物是你根据食品标签输入的，只有你看得到。',
  'Photos are analysed by AI vision models (Google Gemini free tier; when busy, backup models are tried in turn, ending with Cloudflare Workers AI). The AI lists each food and estimates its weight in grams; an optional note you type (for example "half rice") is sent with the photo. If a food matches a dish in the database above, its calories use the database\'s lab values and only the amount comes from the AI; other foods use the AI\'s estimate. Impossible numbers are removed (for example more nutrients than the food weighs), and calories are checked against protein, carbs and fat (4/4/9 kcal/g). Portion estimates from photos can be 20–30% off, so please check and adjust each time.':
    '照片由 AI 视觉模型分析（Google Gemini 免费版；忙碌时会依次尝试备用模型，最后是 Cloudflare Workers AI）。AI 会列出每样食物，并估算它的重量（克）；你输入的备注（例如「半碗饭」）会和照片一起送出。如果食物和上面数据库里的菜相符，卡路里会用数据库的实验室数值，只有分量来自 AI；其他食物则用 AI 的估算。不合理的数字会被去除（例如营养素比食物本身还重），卡路里也会和蛋白质、碳水、脂肪（4/4/9 kcal/g）对照检查。照片估算的分量可能有 20–30% 的误差，所以每次都请检查和调整。',
  'EatHealthee is a health and lifestyle tool. It is not a medical device and does not provide medical diagnosis, treatment or prescriptions.':
    'EatHealthee 是健康和生活方式工具，不是医疗器材，也不提供医疗诊断、治疗或处方。',
  'All calorie, nutrient and water guidance is an estimate based on published formulas and the details you provide, and may differ from your actual needs.':
    '所有卡路里、营养和喝水建议，都是根据公开公式和你提供的资料得出的估算，可能和你的实际需要不同。',
  'If you have any medical condition, are pregnant or breastfeeding, take medicine that affects weight or blood sugar, or have had an eating disorder, talk to a doctor or registered dietitian before changing your diet or exercise.':
    '如果你有任何健康问题、正在怀孕或哺乳、服用会影响体重或血糖的药物，或曾有饮食失调，请在改变饮食或运动前咨询医生或注册营养师。',
  'This service is only for people aged 18 or over.': '本服务只供 18 岁或以上人士使用。',
  'This document is a draft and will be reviewed by a legal professional before public launch.':
    '本文件是草稿，正式推出前会由法律专业人士审阅。',
  'This policy explains how the current version of EatHealthee handles your data.':
    '本政策说明目前版本的 EatHealthee 如何处理你的数据。',
  'What we collect': '我们收集什么',
  "What you enter during setup and use: date of birth, height, weight, waist, goal, activity level, health screening answers, diet preferences, food logs and weight logs. Under Malaysia's Personal Data Protection Act 2010 (PDPA), health data is sensitive personal data, and we only use it with your explicit consent.":
    '你在设置和使用时输入的资料：出生日期、身高、体重、腰围、目标、活动量、健康筛查答案、饮食偏好、饮食记录和体重记录。根据马来西亚《2010 年个人资料保护法令》（PDPA），健康资料属于敏感个人资料，我们只会在你明确同意后使用。',
  'Where your data is stored': '你的数据存放在哪里',
  'Without an account:': '没有账号时：',
  "everything stays in this device's browser and is never sent to a server. Clearing browser data, private browsing or changing devices will lose it.":
    '所有内容都只在这部设备的浏览器里，不会传到服务器。清除浏览器数据、使用无痕模式或更换设备都会让数据消失。',
  'With an account:': '有账号时：',
  'your data is sent over an encrypted connection (HTTPS) to your account, stored for us by our database provider Supabase on servers in Singapore. Access rules mean each account can only read and write its own data. A copy is also kept on your device so you can use the app offline. You are asked for explicit consent to this when you sign up.':
    '你的数据会通过加密连接（HTTPS）传到你的账号，由我们的数据库服务商 Supabase 存放在新加坡的服务器上。访问规则确保每个账号只能读写自己的数据。你的设备上也会保留一份，让你离线时也能使用。注册时会请你明确同意。',
  'AI photos:': 'AI 照片：',
  "only after you take a photo and agree, the photo is shrunk on your phone (removing location and other metadata) and passed through our server to Google Gemini or Cloudflare Workers AI for analysis, together with any note you typed. Our servers do not keep photos; a small thumbnail stays only in your browser so your food log can show it, and is deleted when you delete your data. We keep the food entries you confirm. Google's free-tier terms allow Google to use uploads to improve its products, so please keep faces and personal details out of the shot. To share the free quota fairly, we record how many photos each account uses per day (not the photos themselves).":
    '只有在你拍照并同意后，照片才会在手机上缩小（去除位置等元数据），连同你输入的备注，经过我们的服务器传给 Google Gemini 或 Cloudflare Workers AI 分析。我们的服务器不会保存照片；一张小缩图只保存在你的浏览器里，用在你的饮食记录，删除数据时也会一起删除。我们会保存你确认的食物记录。Google 免费版的条款允许 Google 用上传的内容改进产品，所以请不要拍到人脸和个人资料。为了公平分配免费额度，我们会记录每个账号每天用了多少张照片（不是照片本身）。',
  'How we use it': '我们如何使用',
  'Only to calculate calorie targets, nutrition guidance, trends and insights, and to sync between your devices. We do not sell data or use advertising trackers.':
    '只用来计算卡路里目标、营养建议、趋势和提示，以及在你的设备之间同步。我们不出售数据，也不使用广告追踪。',
  'Your rights': '你的权利',
  'View and change your data at any time on the Me page.': '随时在「我的」页面查看和更改你的数据。',
  'Export all your data (JSON) at any time.': '随时导出你所有的数据（JSON）。',
  'Delete all health records at any time (your account and plan stay); when logged in, they are deleted from the cloud too.':
    '随时删除所有健康记录（账号和计划会保留）；登录时，云端的记录也会一起删除。',
  'Permanently delete your account at any time: your login email, password, all cloud data and photo-count records are deleted together and cannot be recovered.':
    '随时永久删除你的账号：你的登录电邮、密码、所有云端数据和照片次数记录都会一起删除，无法恢复。',
  Changes: '变更',
  'If this policy changes in an important way, we will tell you in the app.':
    '如果本政策有重要变更，我们会在应用里通知你。',
  'This document is a draft and will be reviewed by a legal professional under the PDPA before public launch.':
    '本文件是草稿，正式推出前会由法律专业人士按 PDPA 审阅。',
  'Local dish nutrition': '本地菜营养',
  'Contains information from the Singapore Food Insights Database (SG FoodID), Health Promotion Board, accessed on':
    '包含来自新加坡保健促进局 Singapore Food Insights Database（SG FoodID）的资料，取用日期：',
  ', which is made available under the terms of the SG FoodID Terms of Use:':
    '，按照 SG FoodID 使用条款提供：',
  '. The information is provided "as is" without warranty. EatHealthee is not endorsed by or affiliated with the Health Promotion Board.':
    '。资料按「现状」提供，不附带任何保证。EatHealthee 没有获得保健促进局的认可，也和它没有关联。',
  'Nutrition values for local dishes are taken unchanged from SG FoodID; the display names and serving buttons were added by us. Recipes and portions in Singapore and Malaysia may differ.':
    '本地菜的营养数值直接取自 SG FoodID，没有更改；显示名称和分量按钮是我们加上的。新加坡和马来西亚的做法和分量可能不同。',
  'Basic ingredient nutrition': '基本食材营养',
  'U.S. Department of Agriculture, FoodData Central (SR Legacy), public domain (CC0).':
    '美国农业部 FoodData Central（SR Legacy），公共领域（CC0）。',
  'How is my daily calorie target worked out?': '我的每日卡路里目标是怎么算出来的？',
  'The Mifflin–St Jeor equation gives your basal metabolism, an activity factor turns that into daily burn, and your goal and pace add or subtract from it, never going below a safety floor. See':
    'Mifflin–St Jeor 公式算出你的基础代谢，活动系数把它换算成每日消耗，再按你的目标和速度增减，但绝不低于安全下限。步骤请看',
  'for the steps; your own numbers are in Me → Daily nutrition targets.':
    '；你自己的数字在「我的 → 每日营养目标」。',
  'Why does my weight go up and down every day?': '为什么我的体重每天都上下起伏？',
  'Water, salt, portion size, digestion and hormonal cycles can move your weight 1–2 kg in a day. That is why Progress uses a smoothed trend line to show long-term change.':
    '水分、盐分、分量、消化和荷尔蒙周期，都可能让体重一天变化 1–2 kg。所以「进度」用平滑的趋势线来显示长期变化。',
  'How accurate are AI photo estimates?': 'AI 拍照估算有多准？',
  'The AI first identifies each food. When it matches our database (Singapore SG FoodID, USDA), the database values are used; otherwise the AI estimates. Portions and hidden oil or sugar are hard to see in a photo, so check and adjust amounts before saving. Typing a short note before you snap (for example "half rice") helps.':
    'AI 会先认出每样食物。如果和我们的数据库（新加坡 SG FoodID、USDA）相符，就用数据库的数值；否则由 AI 估算。分量和看不见的油、糖很难从照片看出来，所以保存前请检查和调整分量。拍照前写个简短备注（例如「半碗饭」）会有帮助。',
  'When do target suggestions appear?': '什么时候会出现目标建议？',
  'From 14 days after you start a goal, if the last 3 weeks have enough complete days and weigh-ins, we estimate what you really burn from your intake and weight trend and suggest a new target. It only changes if you tap "Use suggestion".':
    '开始目标 14 天后，如果最近 3 周有足够的完整记录日和称重，我们会根据你的摄取量和体重趋势估算你真正的消耗，并建议新的目标。只有你按「使用建议」时才会改变。',
  'Can the app remind me to log?': '应用可以提醒我记录吗？',
  "Yes. In Me → Reminders, choose the times you want and tap Add to my calendar. The reminders go into your phone's own calendar, so you can change or remove them there.":
    '可以。在「我的 → 提醒」选好时间，按「加到我的日历」。提醒会加到你手机自己的日历里，之后可以在那里更改或删除。',
  'Is my data still there when numbers are hidden?': '隐藏数字后，我的数据还在吗？',
  'Yes. Hiding numbers only removes calories and weight from the screen. Your data is still saved, synced and exported as normal.':
    '还在。隐藏数字只是不在屏幕上显示卡路里和体重。你的数据照样保存、同步和导出。',
  'Where is my data stored? Will I lose it if I change phones?':
    '我的数据存在哪里？换手机会不见吗？',
  "With an account, your data syncs to it, so logging in on a new phone brings it back. Without an account, it stays only in this device's browser.":
    '有账号时，数据会同步到账号，在新手机登录就能找回。没有账号时，数据只在这部设备的浏览器里。',
  'How do I delete my data or account?': '怎样删除我的数据或账号？',
  'Delete single food or weight entries in the Diary and in Progress → Weight log. To delete all your logs, go to Me → Privacy & data. To delete your whole account, tap your name at the top of Me. Account deletion cannot be undone, so export a backup first.':
    '单项食物或体重记录，可以在日记和「进度 → 体重记录」里删除。要删除所有记录，请到「我的 → 隐私与数据」。要删除整个账号，请点「我的」页面最上面的名字。删除账号后无法恢复，所以请先导出备份。',

  // Welcome and account pages
  Eat: 'Eat',
  Healthee: 'Healthee',
  'Log in or sign up': '登录或注册',
  'Snap a photo,': '拍一张照片，',
  'know what you ate.': '就知道你吃了什么。',
  '📷 AI photo calories that know local food': '📷 认得本地美食的 AI 拍照算卡路里',
  '🎯 Safe targets worked out for your body': '🎯 为你的身体计算的安全目标',
  '📈 Weight trends and badges to keep you going': '📈 体重趋势和奖章，帮你坚持下去',
  'Snap · Track · Be Healthier': '拍照 · 记录 · 更健康',
  'Snap to count': '拍照就能算',
  'Take a photo of your meal. AI spots each dish and estimates the calories; you check before it is saved.':
    '拍下你的餐点。AI 会认出每道菜并估算卡路里；保存之前你可以检查。',
  'Made for local food': '专为本地美食设计',
  'Nasi lemak, roti canai, chicken rice, kopi and other Malaysian favourites.':
    'Nasi lemak、roti canai、海南鸡饭、kopi 等马来西亚人爱吃的美食。',
  'Safe targets, real progress': '安全的目标，看得见的进步',
  'A daily target worked out for your body, plus your weight trend, streaks and medals.':
    '为你的身体计算的每日目标，加上体重趋势、连续记录和奖章。',
  'lose fat': '减脂',
  'gain weight': '增重',
  'build muscle': '增肌',
  'stay in shape': '保持身材',
  'Snap · Track · Be healthier': '拍照 · 记录 · 更健康',
  'Snap your meal.': '拍下你的餐点，',
  'Know what you ate.': '就知道你吃了什么。',
  'A free calorie tracker that helps you safely': '一款免费的卡路里记录工具，帮你安全地',
  ', one meal at a time.': '，一餐一餐来。',
  'Free. Set up in about a minute.': '免费。大约一分钟就能设置好。',
  'Start for free': '免费开始',
  'I already have an account': '我已经有账号',
  'Try it without an account ›': '不用账号先试试 ›',
  'By continuing you agree to the': '继续即表示你同意',
  '. Without an account, your data stays on this device.':
    '。没有账号时，你的数据只保存在这部设备。',
  'Welcome back': '欢迎回来',
  "Don't have an account?": '还没有账号？',
  'Sign up free': '免费注册',
  Password: '密码',
  'Forgot password?': '忘记密码？',
  'Logging in…': '正在登录…',
  'Confirm your email': '确认你的电邮',
  'Confirmation email sent': '确认邮件已发送',
  'We sent a confirmation email to': '我们已发送确认邮件到',
  ". Open it and click the link, and you'll be logged in.": '。打开邮件并点击链接，就会自动登录。',
  "Didn't get it? Check your spam folder, or try again in a few minutes.":
    '没收到？请查看垃圾邮件，或过几分钟再试。',
  'Create a free account': '创建免费账号',
  'Have an account?': '已经有账号？',
  'Enter a valid email.': '请输入正确的电邮。',
  'Create a password': '设定密码',
  'Use at least 8 characters.': '请使用至少 8 个字符。',
  'Enter it again': '再输入一次',
  "The passwords don't match.": '两次输入的密码不一样。',
  'I agree to store my body, food and weight records in my account, and have read the':
    '我同意把我的身体、饮食和体重记录保存在我的账号，并已阅读',
  'Signing up…': '正在注册…',
  'Sign up and start': '注册并开始',
  'Reset password': '重设密码',
  "If this email is registered, you'll get a reset email. Click the link in it to set a new password.":
    '如果这个电邮已注册，你会收到一封重设邮件。点击里面的链接就能设定新密码。',
  'Your account email': '你的账号电邮',
  'Send reset link': '发送重设链接',
  'Back to log in': '返回登录',
  'Link expired': '链接已过期',
  'This reset link has been used or has expired. Please request a new one.':
    '这个重设链接已用过或已过期。请重新申请一个。',
  'Send a new reset link': '发送新的重设链接',
  'Set a new password': '设定新密码',
  'New password': '新密码',
  'Save new password': '保存新密码',
  'Loading your data…': '正在载入你的数据…',

  // Plan summary
  'How we calculate': '计算方式',
  '· daily calorie target (estimate)': '· 每日卡路里目标（估算）',
  'About your estimated maintenance calories': '约等于你估算的维持卡路里',
  'About {v1} kcal below estimated maintenance': '比估算的维持卡路里少约 {v1} kcal',
  'About {v1} kcal above estimated maintenance': '比估算的维持卡路里多约 {v1} kcal',
  'Protein is {perKg} g/kg × {ref} kg reference weight. BMR about {bmr} kcal, TDEE about {tdee} kcal.':
    '蛋白质为 {perKg} g/kg × {ref} kg 参考体重。BMR 约 {bmr} kcal，TDEE 约 {tdee} kcal。',
  'Lightly active': '轻度活跃',
  '{label}: about {kcal} kcal': '{label}：约 {kcal} kcal',
  'Daily calories': '每日卡路里',
  'Save profile': '保存个人资料',
  average: '平均值',
  'target {kg} kg': '目标 {kg} kg',
  'Same as start': '和开始时一样',
  'Lost {kg} kg': '减了 {kg} kg',
  '{kg} kg since start': '比开始时 {kg} kg',
  'Gained {kg} kg': '增了 {kg} kg',
  'target {g} g': '目标 {g} g',
  '{n} complete': '{n} 天完整',
  '{n} of {total} days on track': '{total} 天中 {n} 天达标',
  'no food logged': '没有饮食记录',
  'needs 2 weigh-ins': '需要称重 2 次',
  'Less rice': '少饭',
  'No sugar': '无糖',
  'Ate half': '吃了一半',
  'Less oil': '少油',
  'Extra egg': '加蛋',
  ', complete day': '，完整记录日',
  ', logged': '，已记录',
  'Tea time': '下午茶',
  Supper: '宵夜',
  Drink: '饮料',
  Snack: '点心',
  Fruit: '水果',
  '{kcal} kcal per 100 g': '每 100 g {kcal} kcal',
  'Choose from album': '从相册选择',
  Sodium: '钠',
  'Log in to sync your logs across all your devices.': '登录后，你的记录会在所有设备之间同步。',
  'See all your logs on any phone.': '在任何手机上都能看到你的所有记录。',
  "Enter the email you signed up with and we'll send you a reset link.":
    '输入你注册时用的电邮，我们会发送重设链接给你。',
  Undo: '撤销',
  'Welcome! A 1-minute setup': '欢迎！只需 1 分钟设置',
  "What's your main goal right now?": '你现在主要的目标是什么？',
  'Which formula should we use?': '我们该用哪一个公式？',
  'About your body': '关于你的身体',
  'Do any of these apply?': '以下有符合你的吗？',
  'How fast do you want to go?': '你想要多快的速度？',
  'Do you have a target weight?': '你有目标体重吗？',
  'Any diet restrictions?': '有饮食限制吗？',
  'Your plan': '你的计划',
  'The Mifflin–St Jeor formula has male and female versions; neutral is the average':
    'Mifflin–St Jeor 公式有男性和女性两种；中性是两者的平均值',
  'Count work and exercise together': '把工作和运动一起算进去',
  'Only used for safety checks so our advice never puts you at risk. Choose any that apply.':
    '只用来做安全检查，确保我们的建议不会让你有风险。有的请选择。',
  'A slower pace is easier to keep up and helps keep muscle':
    '慢一点比较容易坚持，也有助于保住肌肉',
  "Optional. Only used to show progress; it doesn't change your daily calories":
    '选填。只用来显示进度，不会改变你每日的卡路里',
  'Choose any, or skip': '可以多选，或跳过',
  'Auto (match phone)': '自动（跟随手机）',
  'Hiding calories and weight helps if the numbers stress you out, or someone can see your screen. You still log as usual; the app shows your habits instead.':
    '如果数字让你有压力，或别人看得到你的屏幕，可以隐藏卡路里和体重。你照样记录，应用会改为显示你的习惯。',
  'Check your logs': '检查你的记录',
  '{day}: did you eat less than usual?': '{day}：你吃得比平常少吗？',
  'You logged much less than usual that day.': '你那天记录的比平常少很多。',
  'You logged {kcal} kcal, much less than usual.': '你记录了 {kcal} kcal，比平常少很多。',
  'If some food is missing, we leave the day out so your target stays right.':
    '如果有食物漏记了，我们就不把那天算进去，让你的目标保持准确。',
  'Got it. That day is left out of target checks.': '好的，那天不会用来检查目标。',
  'Got it. That day counts as fully logged.': '好的，那天算作完整记录。',
  'I forgot some food': '我漏记了一些',
  'I ate less': '我真的吃少了',
  'Trend weight is an exponentially weighted moving average of your daily weigh-ins (α = 0.1). With enough data (at least 80% of days fully logged and at least 10 weigh-ins in 3 weeks), we estimate what you really burn from your average intake and trend change, and suggest a change of at most ±150 kcal at a time. You decide whether to accept it.':
    '趋势体重是你每日称重的指数加权移动平均（α = 0.1）。数据足够时（3 周内至少 80% 的日子完整记录，并至少称重 10 次），我们会根据你的平均摄取量和趋势变化，估算你真正的消耗，每次最多建议调整 ±150 kcal。要不要接受由你决定。',
  'What is a "complete day"? Do I need to do anything?': '什么是「完整记录日」？我需要做什么吗？',
  'No. Once a day is over, it counts as complete if you logged food that day. If a day has much less than you usually eat (under half), the app asks whether you ate less or forgot some food. Days with forgotten food are left out of target checks, so half-logged days do not pull your target down.':
    '不需要。一天过去后，只要那天有饮食记录，就会自动算作完整记录日。如果某天记录的比你平常吃的少很多（不到一半），应用会问你是真的吃少了，还是漏记了一些食物。漏记的日子不会用来检查目标，所以只记了一半的日子不会把你的目标拉低。',
  '✓ = a fully logged day. Averages only count days with food logged. Calories and nutrients are estimates and not medical advice.':
    '✓ = 完整记录的日子。平均值只计算有记录饮食的日子。卡路里和营养数据都是估算值，不是医疗意见。',
  '{n} days in a row': '连续 {n} 天',
  'Your data is in your account (servers in Singapore) and on this device. Only you can see it.':
    '你的数据在你的账号（服务器在新加坡）和这部设备上。只有你能看到。',
  "Your data is only on this device. Sign up so you don't lose it if you change phones.":
    '你的数据只在这部设备上。注册账号，换手机时就不会丢失。',
  'Delete data': '删除数据',
  'Your account and all its data, for good': '永久删除账号和所有数据',
};
