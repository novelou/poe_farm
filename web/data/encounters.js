export const mechanics = {
  chaos: { label: 'Trial of Chaos', tone: 'amber' },
  ritual: { label: 'Ritual', tone: 'violet' },
  breach: { label: 'Breach', tone: 'cyan' },
  delirium: { label: 'Delirium', tone: 'violet' },
  abyss: { label: 'Abyss', tone: 'cyan' },
  expedition: { label: 'Expedition', tone: 'amber' },
  fortress: { label: 'Fortress', tone: 'amber' },
  atziri: { label: "Atziri's Temple", tone: 'red' },
  sekhemas: { label: 'Sekhemas', tone: 'sand' },
};

const unknown = (patch = '0.5.x') => ({ type: 'unknown', patch });
const guaranteed = (patch = '0.5.x', sampleSize) => ({ type: 'guaranteed', patch, sampleSize });
const estimate = (value, sampleSize, patch = '0.5.0', approximate = false) => ({ type: 'estimate', value, sampleSize, patch, approximate });

export const encounters = [
  {
    id: 'trial-of-chaos', name: 'Trial of Chaos', mechanic: 'chaos', location: 'Temple of Chaos', tier: 'secondary', aliases: ['Chaos Trial'],
    access: { mode: 'single-item', items: [{ itemName: 'Inscribed Ultimatum', quantity: 1, category: 'Fragments' }], notes: '10ラウンドの試練では最終ボスに応じたFateを獲得でき、Trialmasterへの導線になります。' },
    drops: [
      { itemName: 'Cowardly Fate', kind: 'fragment', probability: unknown(), category: 'Fragments', notes: 'Uxmalの10ラウンド報酬。' },
      { itemName: 'Deadly Fate', kind: 'fragment', probability: unknown(), category: 'Fragments', notes: 'Bahlakの10ラウンド報酬。' },
      { itemName: 'Victorious Fate', kind: 'fragment', probability: unknown(), category: 'Fragments', notes: 'Chetzaの10ラウンド報酬。' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/Trial_of_Chaos' },
  },
  {
    id: 'trialmaster', name: 'The Trialmaster', mechanic: 'chaos', location: "The Trialmaster's Tower", tier: 'primary', aliases: ['Trialmaster'],
    access: { mode: 'multi-item', items: [{ itemName: 'Cowardly Fate', quantity: 1, category: 'Fragments' }, { itemName: 'Deadly Fate', quantity: 1, category: 'Fragments' }, { itemName: 'Victorious Fate', quantity: 1, category: 'Fragments' }], notes: '10ラウンドのTrial of Chaosを完了し、扉に3種のFateを配置します。', prerequisiteEncounterIds: ['trial-of-chaos'] },
    drops: [
      { itemName: 'The Adorned', kind: 'unique', probability: unknown(), category: 'UniqueJewel' },
      { itemName: "Mahuxotl's Machination", kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
      { itemName: 'Hateforge', kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/The_Trialmaster' },
  },
  {
    id: 'atziri', name: 'Atziri, the Red Queen', mechanic: 'atziri', location: "Atziri's Temple", tier: 'primary', aliases: ['Atziri'],
    access: { mode: 'progression', items: [{ itemName: 'Energised Crystal', quantity: 6, priceable: false }], notes: 'Temple Consoleを起動し、Royal Access Chamberを完了してAtziriの扉を解放します。戦利品はボス本体ではなく、撃破後にMedallionで開けるAtziri’s Vaultから出ます。' },
    drops: [
      { itemName: "Atziri's Step", kind: 'unique', probability: unknown('0.5.x'), category: 'UniqueArmour' },
      { itemName: 'Flesh Crucible', kind: 'unique', probability: unknown('0.5.x'), category: 'UniqueJewel' },
      { itemName: "Atziri's Splendour", kind: 'unique', probability: unknown('0.5.x'), category: 'UniqueArmour' },
      { itemName: "Atziri's Acuity", kind: 'unique', probability: unknown('0.5.x'), category: 'UniqueArmour' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/Atziri%2C_the_Red_Queen', notes: '0.4.0の標本値は現行確率として引き継いでいません。' },
  },
  {
    id: 'vessel-of-kulemak', name: 'Vessel of Kulemak', mechanic: 'abyss', location: 'The Black Cathedral', tier: 'primary', aliases: ['Kulemak'],
    access: { mode: 'single-item', items: [{ itemName: "Kulemak's Invitation", quantity: 1, category: 'Fragments' }], notes: '招待状を持ってWell of Soulsに入り、Black Cathedralへ進みます。' },
    drops: [
      { itemName: 'Grip of Kulemak', kind: 'unique', probability: guaranteed('0.5.0'), category: 'UniqueAccessory', notes: 'Lich強化の選択に応じて専用Desecrated modifierを得ます。' },
      { itemName: 'The Unborn Lich', kind: 'unique', probability: estimate(55, 200), category: 'UniqueWeapon' },
      { itemName: "Tecrod's Revenge", kind: 'lineage', probability: estimate(10, 200, '0.5.0', true), category: 'LineageSupportGems' },
      { itemName: 'Darkness Enthroned', kind: 'unique', probability: unknown(), category: 'UniqueAccessory' },
    ],
    source: { patch: '0.5.0', url: 'https://www.poe2wiki.net/wiki/Vessel_of_Kulemak', notes: 'コミュニティ標本 n=200。' },
  },
  {
    id: 'bodach', name: 'The Bodach', mechanic: 'ritual', location: 'Caer Tarth', tier: 'primary', aliases: ['Bodach'],
    access: { mode: 'multi-item', items: [{ itemName: 'Call of the Shadows', quantity: 5, category: 'Fragments' }], notes: '反復版ではCall of the Shadowsを5個、Caer Tarthのeffigyに取り付けます。', prerequisiteEncounterIds: ['king-in-the-mists'] },
    drops: [
      { itemName: 'Vestige of Darkness', kind: 'unique', probability: estimate(56, 100), category: 'UniqueArmour' },
      { itemName: 'Forgotten Warden', kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
      { itemName: 'Carved Cunning', kind: 'augment', probability: unknown(), category: 'Verisium' },
      { itemName: 'Carved Mischief', kind: 'augment', probability: unknown(), category: 'Verisium' },
    ],
    source: { patch: '0.5.0', url: 'https://www.poe2wiki.net/wiki/The_Bodach', notes: 'コミュニティ標本 n=100。' },
  },
  {
    id: 'raven-trickster', name: 'The Raven Trickster', mechanic: 'delirium', location: 'The Withered Hollow', tier: 'primary', aliases: ['Tangmazu'],
    access: { mode: 'single-item', items: [{ itemName: "Raven's Reflection", quantity: 1, category: 'Fragments' }], notes: 'Raven’s ReflectionはSimulacrum完了時に1〜2個得られます。', prerequisiteEncounterIds: ['simulacrum'] },
    drops: [
      { itemName: 'Veilpiercer', kind: 'unique', probability: estimate(30, 295), category: 'UniqueAccessory' },
      { itemName: 'The Auspex', kind: 'unique', probability: estimate(17, 295), category: 'UniqueArmour' },
      { itemName: "Horror's Flight", kind: 'unique', probability: estimate(10, 295), category: 'UniqueArmour' },
      { itemName: "The Raven's Flock", kind: 'unique', probability: estimate(5, 295), category: 'UniqueWeapon' },
      { itemName: 'Split Personality', kind: 'unique', probability: estimate(3, 295, '0.5.0', true), category: 'UniqueJewel' },
    ],
    source: { patch: '0.5.0', url: 'https://www.poe2wiki.net/wiki/The_Raven_Trickster', notes: 'コミュニティ標本 n=295（234 kills）。' },
  },
  {
    id: 'arbiter-of-ash', name: 'The Arbiter of Ash', mechanic: 'fortress', location: 'The Burning Monolith', tier: 'primary', aliases: ['Arbiter'],
    access: { mode: 'multi-item', items: [{ itemName: 'Ancient Crisis Fragment', quantity: 1, category: 'Fragments' }, { itemName: 'Faded Crisis Fragment', quantity: 1, category: 'Fragments' }, { itemName: 'Weathered Crisis Fragment', quantity: 1, category: 'Fragments' }], notes: '現行0.5.xの反復版は3種のCrisis Fragmentを使用します。Calamity Fragmentは旧仕様です。' },
    drops: [
      { itemName: 'Morior Invictus', kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
      { itemName: 'Solus Ipse', kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
      { itemName: 'Sacred Flame', kind: 'unique', probability: unknown(), category: 'UniqueWeapon' },
      { itemName: 'Prism of Belief', kind: 'unique', probability: unknown(), category: 'UniqueJewel' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/The_Arbiter_of_Ash', notes: '0.3.0の標本値は現行確率として引き継いでいません。' },
  },
  {
    id: 'arbiter-of-divinity', name: 'The Arbiter of Divinity', mechanic: 'fortress', location: 'The Origin Tower', tier: 'primary', aliases: ['Divinity'],
    access: { mode: 'multi-item', items: [{ itemName: 'Origin Spark', quantity: 1, category: 'Fragments' }, { itemName: 'Origin Cradle', quantity: 1, category: 'Fragments' }], notes: 'SparkとCradleをPrecursor forgeでOrigin Coreに合成し、Origin Tower頂上へ持ち込みます。' },
    drops: [
      { itemName: 'The Ordained', kind: 'unique', probability: unknown(), category: 'UniqueWeapon' },
      { itemName: "Seraph's Heart", kind: 'other', probability: unknown(), category: 'Fragments' },
      { itemName: 'Her Declaration', kind: 'lineage', probability: unknown(), category: 'LineageSupportGems' },
      { itemName: 'Immaculate Adherence', kind: 'lineage', probability: unknown(), category: 'LineageSupportGems' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/The_Arbiter_of_Divinity' },
  },
  {
    id: 'xesht', name: 'Xesht, We That Are One', mechanic: 'breach', location: 'Twisted Domain', tier: 'primary', aliases: ['Xesht'],
    access: { mode: 'single-item', items: [{ itemName: 'Breachlord Sac', quantity: 1, category: 'Fragments' }], notes: 'Monastery of the KeepersのDreamerにBreachlord Sacを渡します。旧Breach Splinter難易度式は使用しません。' },
    drops: [
      { itemName: 'Hand of Wisdom and Action', kind: 'unique', probability: unknown(), category: 'UniqueWeapon' },
      { itemName: 'The Pandemonius', kind: 'unique', probability: unknown(), category: 'UniqueAccessory' },
      { itemName: 'Beyond Reach', kind: 'unique', probability: unknown(), category: 'UniqueWeapon' },
      { itemName: 'Controlled Metamorphosis', kind: 'unique', probability: unknown(), category: 'UniqueJewel' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/Xesht%2C_We_That_Are_One' },
  },
  {
    id: 'king-in-the-mists', name: 'The King in the Mists', mechanic: 'ritual', location: 'Crux of Nothingness', tier: 'primary', aliases: ['King of the Mists'],
    access: { mode: 'single-item', items: [{ itemName: 'An Audience with the King', quantity: 1, category: 'Fragments' }], notes: 'Atlas上のCrux of Nothingnessを開示するために使用します。0.5.0で再導入された現行キーです。' },
    drops: [
      { itemName: 'Beetlebite', kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
      { itemName: 'Ingenuity', kind: 'unique', probability: unknown(), category: 'UniqueAccessory' },
      { itemName: 'From Nothing', kind: 'unique', probability: unknown(), category: 'UniqueJewel' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/The_King_in_the_Mists', notes: '旧難易度別の標本値は現行確率として引き継いでいません。' },
  },
  {
    id: 'aberration', name: 'The Aberration', mechanic: 'expedition', location: 'Fallen Star', tier: 'primary', aliases: ['Aberration'],
    access: { mode: 'single-item', items: [{ itemName: 'The Triskelion Reforged', quantity: 1, category: 'Fragments' }], notes: 'Shattered TriskelionをRuneforgingして作成。Ruins of KingsmarchからFallen Starへ向かいます。', prerequisiteEncounterIds: ['olroth'] },
    drops: [
      { itemName: 'Revered Starlit Ore', kind: 'other', probability: unknown(), category: 'Verisium' },
      { itemName: 'Venerable Starlit Ore', kind: 'other', probability: unknown(), category: 'Verisium' },
      { itemName: 'Veridical Starlit Ore', kind: 'other', probability: unknown(), category: 'Verisium' },
      { itemName: 'Emergent Instinct', kind: 'augment', probability: unknown(), category: 'Verisium' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/The_Aberration' },
  },
  {
    id: 'simulacrum', name: 'Simulacrum', mechanic: 'delirium', location: 'Atlas · Delirium', tier: 'secondary', aliases: [],
    access: { mode: 'single-item', items: [{ itemName: 'Simulacrum', quantity: 1, category: 'Fragments' }], notes: '7 wavesを完了するとRaven’s Reflectionを1〜2個獲得します。' },
    drops: [
      { itemName: "Raven's Reflection", kind: 'fragment', probability: guaranteed('0.5.0', 59), category: 'Fragments', notes: '完了時に1〜2個。' },
      { itemName: 'Assailum', kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
      { itemName: 'Melting Maelstrom', kind: 'unique', probability: unknown(), category: 'UniqueFlask' },
      { itemName: 'Strugglescream', kind: 'unique', probability: unknown(), category: 'UniqueAccessory' },
    ],
    source: { patch: '0.5.0', url: 'https://www.poe2wiki.net/wiki/The_Simulacrum', notes: 'コミュニティ標本 n=59。' },
  },
  {
    id: 'zarokh', name: 'Zarokh, the Temporal', mechanic: 'sekhemas', location: 'Trial of the Sekhemas · Floor 4', tier: 'secondary', aliases: ['Zarokh'],
    access: { mode: 'special', items: [{ itemName: 'Djinn Barya', quantity: 1, category: 'Fragments' }], notes: '4 floorsを持つ高レベルのDjinn Baryaが必要です。価格は鍵の階層・Area Level差を区別できない場合があります。' },
    drops: [
      { itemName: 'The Last Flame', kind: 'relic', probability: unknown(), category: 'UniqueRelic' },
      { itemName: 'The Changing Seasons', kind: 'relic', probability: unknown(), category: 'UniqueRelic' },
      { itemName: 'The Desperate Alliance', kind: 'relic', probability: unknown(), category: 'UniqueRelic' },
      { itemName: "Zarokh's Refrain", kind: 'lineage', probability: unknown(), category: 'LineageSupportGems' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/Zarokh%2C_the_Temporal', notes: '古い個別確率は現行値として使用していません。' },
  },
  {
    id: 'olroth', name: 'Olroth, Origin of the Fall', mechanic: 'expedition', location: 'Obscure Island', tier: 'secondary', aliases: ['Olroth'],
    access: { mode: 'progression', items: [{ itemName: 'Expedition Logbook', quantity: 1, category: 'Expedition' }, { itemName: "Olroth's Saga", quantity: 1, category: 'Ritual', optional: true }], notes: '0.5.xではExpedition LogbookのObscure Islandで遭遇。Olroth’s Sagaは次のLogbookで遭遇を保証します。' },
    drops: [
      { itemName: 'Svalinn', kind: 'unique', probability: unknown(), category: 'UniqueArmour' },
      { itemName: 'Heroic Tragedy', kind: 'unique', probability: unknown(), category: 'UniqueJewel' },
      { itemName: "Olroth's Resolve", kind: 'unique', probability: unknown(), category: 'UniqueFlask' },
      { itemName: "Uhtred's Augury", kind: 'lineage', probability: unknown(), category: 'LineageSupportGems' },
    ],
    source: { patch: '0.5.x', url: 'https://www.poe2wiki.net/wiki/Olroth%2C_Origin_of_the_Fall', notes: '0.3.0の標本値は現行確率として引き継いでいません。' },
  },
];

export function validateEncounters(data = encounters) {
  const errors = [];
  const ids = new Set();
  for (const encounter of data) {
    if (!encounter.id || ids.has(encounter.id)) errors.push(`duplicate or empty id: ${encounter.id}`);
    ids.add(encounter.id);
    if (!encounter.name?.trim()) errors.push(`${encounter.id}: empty name`);
    if (!mechanics[encounter.mechanic]) errors.push(`${encounter.id}: invalid mechanic`);
    for (const item of encounter.access.items || []) if (!item.itemName?.trim() || item.quantity <= 0) errors.push(`${encounter.id}: invalid access item`);
    for (const drop of encounter.drops || []) {
      if (!drop.itemName?.trim()) errors.push(`${encounter.id}: empty drop`);
      const p = drop.probability || {};
      if (p.type === 'estimate' && (!(p.value >= 0 && p.value <= 100) || !p.patch)) errors.push(`${encounter.id}/${drop.itemName}: invalid estimate`);
      if (p.type === 'range' && (!(p.min >= 0 && p.max <= 100 && p.min <= p.max))) errors.push(`${encounter.id}/${drop.itemName}: invalid range`);
    }
  }
  for (const encounter of data) for (const prerequisite of encounter.access.prerequisiteEncounterIds || []) if (!ids.has(prerequisite)) errors.push(`${encounter.id}: missing prerequisite ${prerequisite}`);
  return errors;
}

const validationErrors = validateEncounters();
if (validationErrors.length) throw new Error(`Invalid encounter data:\n${validationErrors.join('\n')}`);
