import type { ArchetypeName } from '../types/card';
import type {
  StoryPillarOption,
  StoryPillarQuestion,
} from '../types/bible';

/**
 * Guided Narrative Chains — Bible §Step 10 per archetype.
 *
 * Bible §Guided Narrative Chains:
 *  - Show approximately five compatible options at a time.
 *  - Unlimited refreshes during initial implementation.
 *  - Individual options may be locked; refresh only unlocked slots.
 *  - Preserve locks while navigating; avoid immediate repeats.
 *  - Every option must read as a complete answer to the question.
 *
 * Player answers are IMMUTABLE generation facts. Claude may connect and
 * interpret them, but must not ignore, replace, soften, or contradict them.
 *
 * Seed pools below are Bible-grounded (sourced from §4 Culture, §5 Virtues/
 * Taboos/Fears, §6 Internal Diversity, and §8 Symbol/Material Language for
 * each archetype). Editing them requires Raheem approval + Lore Director
 * review.
 */

// ---------- Types local to this file ----------

interface ArchetypeChain {
  archetype: ArchetypeName;
  questions: StoryPillarQuestion[];
  options: StoryPillarOption[];
}

/**
 * Convenience helper for constructing seed options. Tags flow into the Rare
 * element narrative-eligibility gate in data/elements.ts.
 */
function opt(
  id: string,
  questionId: string,
  text: string,
  ...tags: string[]
): StoryPillarOption {
  return { id, questionId, text, tags };
}

/**
 * P5 Seraph corruption arc — attach a narrative-axis alignment weight to an
 * option. Weight is separate from thematic tags: +1 leans Good, -1 leans
 * Fallen, 0 is Balanced-leaning. See services/narrativeAxisService.ts.
 */
function weigh(option: StoryPillarOption, alignmentWeight: number): StoryPillarOption {
  return { ...option, alignmentWeight };
}

// ============================================================================
// BARBARIAN
// ============================================================================

const BARBARIAN_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'bar_p1_q1', pillarIndex: 1, prompt: 'What are you willing to fight for?' },
  { id: 'bar_p1_q2', pillarIndex: 1, prompt: 'What are you willing to sacrifice?', followUp: true, parentId: 'bar_p1_q1' },
  { id: 'bar_p2_q1', pillarIndex: 2, prompt: 'Where do you call home?' },
  { id: 'bar_p2_q2', pillarIndex: 2, prompt: 'What threatens your home the most?', followUp: true, parentId: 'bar_p2_q1' },
  { id: 'bar_p3_q1', pillarIndex: 3, prompt: 'What did your clan entrust to you?' },
  { id: 'bar_p3_q2', pillarIndex: 3, prompt: 'Why were you chosen?', followUp: true, parentId: 'bar_p3_q1' },
];

const BARBARIAN_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('bar_p1_q1_a1', 'bar_p1_q1', 'The children too young to remember why the walls fell.', 'protective', 'clan'),
  opt('bar_p1_q1_a2', 'bar_p1_q1', 'Every name my clan is still allowed to speak.', 'legacy', 'memory'),
  opt('bar_p1_q1_a3', 'bar_p1_q1', 'The road so those who come after do not have to walk it alone.', 'travel', 'wanderer'),
  opt('bar_p1_q1_a4', 'bar_p1_q1', 'The stone my ancestors are buried beneath.', 'ancestral', 'place'),
  opt('bar_p1_q1_a5', 'bar_p1_q1', 'The oaths my elders took before I was born.', 'oath', 'inheritance'),
  opt('bar_p1_q1_a6', 'bar_p1_q1', 'A single guest under my roof who is not yet safe.', 'hospitality', 'protective'),
  opt('bar_p1_q1_a7', 'bar_p1_q1', 'The chance to make a truthful record of what happened.', 'memory', 'legacy'),
  opt('bar_p1_q1_a8', 'bar_p1_q1', 'The person who taught me how to hold a shield.', 'kinship', 'oath'),
  opt('bar_p1_q1_a9', 'bar_p1_q1', 'The debt my mother could never repay in her lifetime.', 'inheritance', 'kinship'),
  opt('bar_p1_q1_a10', 'bar_p1_q1', 'The stubborn belief that we are still here.', 'legacy', 'resilience'),
  // P1Q2
  opt('bar_p1_q2_a1', 'bar_p1_q2', 'My name — I would be forgotten if it kept anyone safe.', 'sacrifice', 'erasure'),
  opt('bar_p1_q2_a2', 'bar_p1_q2', 'Every year I have left, if the trade were fair.', 'sacrifice', 'inheritance'),
  opt('bar_p1_q2_a3', 'bar_p1_q2', 'My place at the fire when I go home.', 'exile', 'sacrifice'),
  opt('bar_p1_q2_a4', 'bar_p1_q2', 'The relic in my hand — I have carried it long enough.', 'inheritance', 'sacrifice'),
  opt('bar_p1_q2_a5', 'bar_p1_q2', 'The good opinion of everyone who does not know the truth.', 'sacrifice', 'oath'),
  opt('bar_p1_q2_a6', 'bar_p1_q2', 'One hand, if I could keep the other free to work.', 'sacrifice', 'disability'),
  opt('bar_p1_q2_a7', 'bar_p1_q2', 'A promise I once made to a friend now gone.', 'sacrifice', 'grief'),
  opt('bar_p1_q2_a8', 'bar_p1_q2', 'My hope of ever being at rest again.', 'sacrifice', 'burden'),
  opt('bar_p1_q2_a9', 'bar_p1_q2', 'Nothing my clan would not sacrifice with me.', 'kinship', 'oath'),
  opt('bar_p1_q2_a10', 'bar_p1_q2', 'Whatever is required, once I have thought it through.', 'sacrifice', 'restraint'),
  // P2Q1
  opt('bar_p2_q1_a1', 'bar_p2_q1', 'A ring of stones on the highest pass, where our dead are named.', 'place', 'ancestral'),
  opt('bar_p2_q1_a2', 'bar_p2_q1', 'The wagons and whoever is inside them tonight.', 'travel', 'wanderer'),
  opt('bar_p2_q1_a3', 'bar_p2_q1', 'The salt-town my mother rebuilt with her own hands.', 'place', 'kinship'),
  opt('bar_p2_q1_a4', 'bar_p2_q1', 'The forest my clan has protected for six generations.', 'stewardship', 'ancestral'),
  opt('bar_p2_q1_a5', 'bar_p2_q1', 'A river valley the maps do not name.', 'place', 'secret'),
  opt('bar_p2_q1_a6', 'bar_p2_q1', 'Wherever my clan has decided to make camp this month.', 'wanderer', 'clan'),
  opt('bar_p2_q1_a7', 'bar_p2_q1', 'A city that fell and the memory of what it was.', 'grief', 'legacy'),
  opt('bar_p2_q1_a8', 'bar_p2_q1', 'The mountain hall my grandmother refused to abandon.', 'ancestral', 'oath'),
  opt('bar_p2_q1_a9', 'bar_p2_q1', 'A frontier settlement everyone else has quietly given up on.', 'stewardship', 'place'),
  opt('bar_p2_q1_a10', 'bar_p2_q1', 'A road, three seasons long, that only my clan still travels.', 'travel', 'legacy'),
  // P2Q2
  opt('bar_p2_q2_a1', 'bar_p2_q2', 'A neighboring warband that has begun to erase our name from the record.', 'erasure', 'confrontation'),
  opt('bar_p2_q2_a2', 'bar_p2_q2', 'A slow winter our stores were not built to survive.', 'hardship', 'resilience'),
  opt('bar_p2_q2_a3', 'bar_p2_q2', 'A plague no elder in living memory recognized.', 'grief', 'hardship'),
  opt('bar_p2_q2_a4', 'bar_p2_q2', 'A merchant coalition buying up the wells.', 'confrontation', 'stewardship'),
  opt('bar_p2_q2_a5', 'bar_p2_q2', 'A distant empire that thinks our stones would look better elsewhere.', 'confrontation', 'legacy'),
  opt('bar_p2_q2_a6', 'bar_p2_q2', 'Our own quarrels — we have started to forget how to speak to each other.', 'kinship', 'grief'),
  opt('bar_p2_q2_a7', 'bar_p2_q2', 'Something old under the earth that we thought would sleep forever.', 'ancient', 'confrontation'),
  opt('bar_p2_q2_a8', 'bar_p2_q2', 'The route being renamed in a language none of us speak.', 'erasure', 'legacy'),
  opt('bar_p2_q2_a9', 'bar_p2_q2', 'A river the storms have started taking, house by house.', 'hardship', 'grief'),
  opt('bar_p2_q2_a10', 'bar_p2_q2', 'A raid party that comes back every spring, and every spring is smaller — but so are we.', 'confrontation', 'hardship'),
  // P3Q1
  opt('bar_p3_q1_a1', 'bar_p3_q1', 'A weapon repaired seven times, older than my grandmother.', 'inheritance', 'legacy'),
  opt('bar_p3_q1_a2', 'bar_p3_q1', 'The oral history of every clan meeting in the past forty years.', 'memory', 'legacy'),
  opt('bar_p3_q1_a3', 'bar_p3_q1', 'A pouch of soil from the ground where our first hearth burned.', 'ancestral', 'inheritance'),
  opt('bar_p3_q1_a4', 'bar_p3_q1', 'The debt-book. Every name we owe and every name that owes us.', 'inheritance', 'oath'),
  opt('bar_p3_q1_a5', 'bar_p3_q1', 'One child, and the promise to bring them back alive.', 'protective', 'oath'),
  opt('bar_p3_q1_a6', 'bar_p3_q1', 'A treaty that was never written down, only remembered aloud.', 'oath', 'memory'),
  opt('bar_p3_q1_a7', 'bar_p3_q1', 'The relic that decides who stands guard at the door of the hall.', 'inheritance', 'sacred'),
  opt('bar_p3_q1_a8', 'bar_p3_q1', 'A song only the last three living voices know.', 'memory', 'legacy'),
  opt('bar_p3_q1_a9', 'bar_p3_q1', 'The map to a place we may never be allowed to return to.', 'exile', 'legacy'),
  opt('bar_p3_q1_a10', 'bar_p3_q1', 'A promise made to a dying elder that I have not yet kept.', 'oath', 'burden'),
  // P3Q2
  opt('bar_p3_q2_a1', 'bar_p3_q2', 'I was the one still standing after a night no one thought would end.', 'resilience', 'grief'),
  opt('bar_p3_q2_a2', 'bar_p3_q2', 'I asked the questions the elders had stopped asking.', 'clan', 'confrontation'),
  opt('bar_p3_q2_a3', 'bar_p3_q2', 'I remember things I was too young to have seen.', 'memory', 'mystery'),
  opt('bar_p3_q2_a4', 'bar_p3_q2', 'I lost the argument. The relic was placed in my hand as a rebuke.', 'burden', 'clan'),
  opt('bar_p3_q2_a5', 'bar_p3_q2', 'I was the only one who would carry it out of the fire.', 'protective', 'sacrifice'),
  opt('bar_p3_q2_a6', 'bar_p3_q2', 'A dream told an elder my name and they did not doubt it.', 'sacred', 'inheritance'),
  opt('bar_p3_q2_a7', 'bar_p3_q2', 'My name comes from a lineage of people who did not run.', 'legacy', 'kinship'),
  opt('bar_p3_q2_a8', 'bar_p3_q2', 'I have a stubbornness the clan has learned to rely on.', 'resilience', 'clan'),
  opt('bar_p3_q2_a9', 'bar_p3_q2', 'They saw me repair what everyone else had given up on.', 'craft', 'stewardship'),
  opt('bar_p3_q2_a10', 'bar_p3_q2', 'No one else was left. There is no braver reason.', 'burden', 'grief'),
];

// ============================================================================
// MONK
// ============================================================================

const MONK_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'mnk_p1_q1', pillarIndex: 1, prompt: 'What discipline shaped you?' },
  { id: 'mnk_p2_q1', pillarIndex: 2, prompt: 'What disturbs your inner balance?' },
  { id: 'mnk_p3_q1', pillarIndex: 3, prompt: 'What vow defines you?' },
  { id: 'mnk_p3_q2', pillarIndex: 3, prompt: 'Why did you make this vow?', followUp: true, parentId: 'mnk_p3_q1' },
];

const MONK_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('mnk_p1_q1_a1', 'mnk_p1_q1', 'A martial form taught wordlessly, one motion each morning.', 'martial'),
  opt('mnk_p1_q1_a2', 'mnk_p1_q1', 'Copying and repairing books others had already given up on.', 'craft', 'preservation'),
  opt('mnk_p1_q1_a3', 'mnk_p1_q1', 'Healing — dressing wounds nobody else would touch.', 'service', 'craft'),
  opt('mnk_p1_q1_a4', 'mnk_p1_q1', 'The garden, one season at a time.', 'cycles', 'restoration'),
  opt('mnk_p1_q1_a5', 'mnk_p1_q1', 'Astronomy — long nights, patient charts.', 'sacred', 'preservation'),
  opt('mnk_p1_q1_a6', 'mnk_p1_q1', 'Diplomacy — hearing every side before I spoke.', 'service', 'restraint'),
  opt('mnk_p1_q1_a7', 'mnk_p1_q1', 'A single blade drawn ten thousand times.', 'martial', 'restraint'),
  opt('mnk_p1_q1_a8', 'mnk_p1_q1', 'Music — the same phrase every dawn until it sounded right.', 'sacred', 'discipline'),
  opt('mnk_p1_q1_a9', 'mnk_p1_q1', 'Silence — the discipline of not filling every quiet space.', 'restraint', 'sacred'),
  opt('mnk_p1_q1_a10', 'mnk_p1_q1', 'Teaching — I could not stay a student and remain honest.', 'service', 'discipline'),
  // P2Q1
  opt('mnk_p2_q1_a1', 'mnk_p2_q1', 'A student I taught who used what they learned to hurt someone.', 'grief', 'burden'),
  opt('mnk_p2_q1_a2', 'mnk_p2_q1', 'Praise. It always comes just before I make a mistake.', 'restraint', 'humility'),
  opt('mnk_p2_q1_a3', 'mnk_p2_q1', 'The letter from home I have not opened yet.', 'kinship', 'mystery'),
  opt('mnk_p2_q1_a4', 'mnk_p2_q1', 'The rival who is not wrong, only ahead of me.', 'confrontation', 'humility'),
  opt('mnk_p2_q1_a5', 'mnk_p2_q1', 'Injury. My body no longer answers me the way it did.', 'disability', 'burden'),
  opt('mnk_p2_q1_a6', 'mnk_p2_q1', 'The suspicion that my teacher was pretending mastery.', 'confrontation', 'grief'),
  opt('mnk_p2_q1_a7', 'mnk_p2_q1', 'A hunger the discipline was supposed to have quieted.', 'burden', 'restraint'),
  opt('mnk_p2_q1_a8', 'mnk_p2_q1', 'The war that arrived at our gate and refused to be reasoned with.', 'confrontation', 'grief'),
  opt('mnk_p2_q1_a9', 'mnk_p2_q1', 'A friend who kept the vow when I broke it.', 'kinship', 'humility'),
  opt('mnk_p2_q1_a10', 'mnk_p2_q1', 'Silence. My discipline was learned in noise, and now I fear the quiet.', 'restraint', 'grief'),
  // P3Q1
  opt('mnk_p3_q1_a1', 'mnk_p3_q1', 'I will never draw this weapon unless another hand is on my throat.', 'restraint', 'oath'),
  opt('mnk_p3_q1_a2', 'mnk_p3_q1', 'I will not accept a student who cannot look me in the eye.', 'oath', 'service'),
  opt('mnk_p3_q1_a3', 'mnk_p3_q1', 'I will hear every side before I judge — or I will not judge at all.', 'oath', 'service'),
  opt('mnk_p3_q1_a4', 'mnk_p3_q1', 'I will not speak the name of the man who broke my order.', 'silence', 'grief'),
  opt('mnk_p3_q1_a5', 'mnk_p3_q1', 'I will finish what my teacher could not.', 'oath', 'inheritance'),
  opt('mnk_p3_q1_a6', 'mnk_p3_q1', 'I will teach anyone who asks, no matter what they came from.', 'service', 'oath'),
  opt('mnk_p3_q1_a7', 'mnk_p3_q1', 'I will not eat until I have earned it.', 'discipline', 'humility'),
  opt('mnk_p3_q1_a8', 'mnk_p3_q1', 'I will keep one day a year for the person who saved me.', 'oath', 'kinship'),
  opt('mnk_p3_q1_a9', 'mnk_p3_q1', 'I will never pretend to a mastery I have not tested.', 'humility', 'oath'),
  opt('mnk_p3_q1_a10', 'mnk_p3_q1', 'I will not turn away a sincere question, however uncomfortable.', 'service', 'discipline'),
  // P3Q2
  opt('mnk_p3_q2_a1', 'mnk_p3_q2', 'I saw what happened when the vow was ignored, and I never wanted to see it again.', 'grief', 'restraint'),
  opt('mnk_p3_q2_a2', 'mnk_p3_q2', 'My teacher asked. That was enough.', 'kinship', 'oath'),
  opt('mnk_p3_q2_a3', 'mnk_p3_q2', 'It is the only shape my discipline still holds without collapsing.', 'discipline', 'humility'),
  opt('mnk_p3_q2_a4', 'mnk_p3_q2', 'I could not carry the alternative and still call myself a Monk.', 'oath', 'burden'),
  opt('mnk_p3_q2_a5', 'mnk_p3_q2', 'I made it to a person who cannot hear the answer.', 'grief', 'oath'),
  opt('mnk_p3_q2_a6', 'mnk_p3_q2', 'It is the promise I made instead of running.', 'oath', 'resilience'),
  opt('mnk_p3_q2_a7', 'mnk_p3_q2', 'It was written into my order the day I was born into it.', 'inheritance', 'oath'),
  opt('mnk_p3_q2_a8', 'mnk_p3_q2', 'I broke a smaller vow first, and this is the one I am not willing to break.', 'burden', 'humility'),
  opt('mnk_p3_q2_a9', 'mnk_p3_q2', 'It is the answer I found at the end of a long question.', 'discipline', 'insight'),
  opt('mnk_p3_q2_a10', 'mnk_p3_q2', 'Because no one else could be trusted to hold it.', 'service', 'burden'),
];

// ============================================================================
// BEASTMASTER
// ============================================================================

const BEASTMASTER_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'bm_p1_q1', pillarIndex: 1, prompt: 'What animal are you bonded with?' },
  { id: 'bm_p1_q2', pillarIndex: 1, prompt: 'What kind of bond do you share?', followUp: true, parentId: 'bm_p1_q1' },
  { id: 'bm_p2_q1', pillarIndex: 2, prompt: 'Why did your companion choose you?' },
  { id: 'bm_p3_q1', pillarIndex: 3, prompt: 'Where did your paths first cross?' },
];

const BEASTMASTER_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('bm_p1_q1_a1', 'bm_p1_q1', 'A river otter my grandmother trained, now grown old with me.', 'bond', 'kinship'),
  opt('bm_p1_q1_a2', 'bm_p1_q1', 'A raven who has followed me across three regions.', 'bond', 'travel'),
  opt('bm_p1_q1_a3', 'bm_p1_q1', 'A one-eyed hunting cat pulled from a fire.', 'bond', 'rescue'),
  opt('bm_p1_q1_a4', 'bm_p1_q1', 'A working dog from a village that no longer exists.', 'bond', 'grief'),
  opt('bm_p1_q1_a5', 'bm_p1_q1', 'A cliff-goat older than I am, more patient than I will ever be.', 'bond', 'partnership'),
  opt('bm_p1_q1_a6', 'bm_p1_q1', 'A herd — I am bonded to five, not one.', 'pack', 'stewardship'),
  opt('bm_p1_q1_a7', 'bm_p1_q1', 'A messenger falcon whose route I have promised to protect.', 'bond', 'oath'),
  opt('bm_p1_q1_a8', 'bm_p1_q1', 'A great tortoise the archives insist should have died a century ago.', 'bond', 'ancient'),
  opt('bm_p1_q1_a9', 'bm_p1_q1', 'A pack-mule who has saved my life more often than any weapon.', 'partnership', 'travel'),
  opt('bm_p1_q1_a10', 'bm_p1_q1', 'A wild horse who accepts me now — and only now — as company.', 'bond', 'trust'),
  // P1Q2
  opt('bm_p1_q2_a1', 'bm_p1_q2', 'We share silence better than words.', 'trust', 'restraint'),
  opt('bm_p1_q2_a2', 'bm_p1_q2', 'They lead. I follow more often than the songs would have you believe.', 'partnership', 'humility'),
  opt('bm_p1_q2_a3', 'bm_p1_q2', 'We work — hunt, plow, carry — and rest is earned by both of us.', 'partnership', 'craft'),
  opt('bm_p1_q2_a4', 'bm_p1_q2', 'A daily promise, renewed every morning without ceremony.', 'oath', 'discipline'),
  opt('bm_p1_q2_a5', 'bm_p1_q2', 'A rescue that neither of us has forgotten.', 'kinship', 'bond'),
  opt('bm_p1_q2_a6', 'bm_p1_q2', 'A watch — one of us is always the other one\'s awake side.', 'protective', 'partnership'),
  opt('bm_p1_q2_a7', 'bm_p1_q2', 'A shared language of small signs that outsiders never quite catch.', 'bond', 'insight'),
  opt('bm_p1_q2_a8', 'bm_p1_q2', 'A grief. We lost the same person on the same day.', 'grief', 'kinship'),
  opt('bm_p1_q2_a9', 'bm_p1_q2', 'The kind you cannot explain and must not overstate.', 'bond', 'restraint'),
  opt('bm_p1_q2_a10', 'bm_p1_q2', 'A long apology, still being paid off.', 'burden', 'bond'),
  // P2Q1
  opt('bm_p2_q1_a1', 'bm_p2_q1', 'I chose to wait when everyone else demanded I move.', 'restraint', 'trust'),
  opt('bm_p2_q1_a2', 'bm_p2_q1', 'I stopped talking. It let them start.', 'restraint', 'trust'),
  opt('bm_p2_q1_a3', 'bm_p2_q1', 'I was the only person left in the room.', 'grief', 'kinship'),
  opt('bm_p2_q1_a4', 'bm_p2_q1', 'I fed them long before I asked anything.', 'patience', 'service'),
  opt('bm_p2_q1_a5', 'bm_p2_q1', 'I let them decide the first three questions.', 'humility', 'partnership'),
  opt('bm_p2_q1_a6', 'bm_p2_q1', 'I did not try to name them.', 'restraint', 'trust'),
  opt('bm_p2_q1_a7', 'bm_p2_q1', 'I owed a debt to their mother.', 'inheritance', 'oath'),
  opt('bm_p2_q1_a8', 'bm_p2_q1', 'I am my grandmother\'s hands, and they remember her.', 'inheritance', 'kinship'),
  opt('bm_p2_q1_a9', 'bm_p2_q1', 'I did not turn back the second time I got lost with them.', 'resilience', 'trust'),
  opt('bm_p2_q1_a10', 'bm_p2_q1', 'I have no idea. I try not to make them regret it.', 'humility', 'partnership'),
  // P3Q1
  opt('bm_p3_q1_a1', 'bm_p3_q1', 'A river that only ran two seasons that year.', 'travel', 'stewardship'),
  opt('bm_p3_q1_a2', 'bm_p3_q1', 'A trapping line I dismantled and never rebuilt.', 'stewardship', 'restraint'),
  opt('bm_p3_q1_a3', 'bm_p3_q1', 'A market stall where they were being sold to strangers.', 'rescue', 'confrontation'),
  opt('bm_p3_q1_a4', 'bm_p3_q1', 'A snowfield after the raid, where nothing else moved for a long time.', 'grief', 'rescue'),
  opt('bm_p3_q1_a5', 'bm_p3_q1', 'A mountain pass, both of us bleeding and both of us alive.', 'travel', 'trust'),
  opt('bm_p3_q1_a6', 'bm_p3_q1', 'My grandmother\'s doorway. They walked in and never truly left.', 'inheritance', 'kinship'),
  opt('bm_p3_q1_a7', 'bm_p3_q1', 'A grove that had been quiet for far too long.', 'stewardship', 'mystery'),
  opt('bm_p3_q1_a8', 'bm_p3_q1', 'A siege camp, on opposite sides.', 'confrontation', 'trust'),
  opt('bm_p3_q1_a9', 'bm_p3_q1', 'A shipping run I was not supposed to survive.', 'rescue', 'partnership'),
  opt('bm_p3_q1_a10', 'bm_p3_q1', 'A shoreline littered with what had been washed up. Us, mostly.', 'grief', 'travel'),
];

// ============================================================================
// DRUID
// ============================================================================

const DRUID_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'dru_p1_q1', pillarIndex: 1, prompt: 'What part of nature calls to you?' },
  { id: 'dru_p2_q1', pillarIndex: 2, prompt: 'What does nature ask of you?' },
  { id: 'dru_p3_q1', pillarIndex: 3, prompt: 'What threatens the natural balance you protect?' },
];

const DRUID_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('dru_p1_q1_a1', 'dru_p1_q1', 'The river that our valley depends on and forgets.', 'cycles', 'stewardship'),
  opt('dru_p1_q1_a2', 'dru_p1_q1', 'The long slow work of a fungal forest floor.', 'cycles', 'restoration'),
  opt('dru_p1_q1_a3', 'dru_p1_q1', 'The migration route no one has bothered to protect.', 'cycles', 'travel'),
  opt('dru_p1_q1_a4', 'dru_p1_q1', 'The tidal shelf my order has watched for four generations.', 'stewardship', 'legacy'),
  opt('dru_p1_q1_a5', 'dru_p1_q1', 'A single tree older than my order\'s records.', 'ancient', 'stewardship'),
  opt('dru_p1_q1_a6', 'dru_p1_q1', 'The tundra edge, where things move slower than anywhere.', 'stewardship', 'cycles'),
  opt('dru_p1_q1_a7', 'dru_p1_q1', 'The storm season — every year we survive it, we learn something.', 'cycles', 'confrontation'),
  opt('dru_p1_q1_a8', 'dru_p1_q1', 'The seed banks passed hand to hand through my circle.', 'preservation', 'legacy'),
  opt('dru_p1_q1_a9', 'dru_p1_q1', 'A coral reef I have not seen in twenty years but still speak for.', 'stewardship', 'exile'),
  opt('dru_p1_q1_a10', 'dru_p1_q1', 'The rain, when it comes at the wrong time.', 'cycles', 'grief'),
  // P2Q1
  opt('dru_p2_q1_a1', 'dru_p2_q1', 'To restore what was ruined before I arrived.', 'restoration', 'stewardship'),
  opt('dru_p2_q1_a2', 'dru_p2_q1', 'To wait — the cycle will teach me before it teaches anyone else.', 'patience', 'insight'),
  opt('dru_p2_q1_a3', 'dru_p2_q1', 'To speak for it in the councils of people who do not listen.', 'service', 'confrontation'),
  opt('dru_p2_q1_a4', 'dru_p2_q1', 'To carry seeds forward when the fields fail.', 'preservation', 'legacy'),
  opt('dru_p2_q1_a5', 'dru_p2_q1', 'To grieve properly for what has already been lost.', 'grief', 'cycles'),
  opt('dru_p2_q1_a6', 'dru_p2_q1', 'To teach — my circle is smaller every year.', 'service', 'kinship'),
  opt('dru_p2_q1_a7', 'dru_p2_q1', 'To stand in front of the axe.', 'protective', 'confrontation'),
  opt('dru_p2_q1_a8', 'dru_p2_q1', 'To make a truthful record no one has an incentive to make.', 'memory', 'legacy'),
  opt('dru_p2_q1_a9', 'dru_p2_q1', 'To heal — my hands know the plants no apothecary bothers with.', 'craft', 'service'),
  opt('dru_p2_q1_a10', 'dru_p2_q1', 'To decide, when no one else can, what a cycle is worth.', 'burden', 'stewardship'),
  // P3Q1
  opt('dru_p3_q1_a1', 'dru_p3_q1', 'A logging company with a very good letter of authorization.', 'confrontation', 'grief'),
  opt('dru_p3_q1_a2', 'dru_p3_q1', 'A mine tailing pond nobody has flagged as dangerous.', 'confrontation', 'restoration'),
  opt('dru_p3_q1_a3', 'dru_p3_q1', 'The changing climate. The old signs no longer apply.', 'cycles', 'grief'),
  opt('dru_p3_q1_a4', 'dru_p3_q1', 'A rival circle with a very different reading of what balance means.', 'confrontation', 'kinship'),
  opt('dru_p3_q1_a5', 'dru_p3_q1', 'A war that has begun using the forest as a corridor.', 'confrontation', 'grief'),
  opt('dru_p3_q1_a6', 'dru_p3_q1', 'A plague spreading from the tree line into the villages.', 'grief', 'restoration'),
  opt('dru_p3_q1_a7', 'dru_p3_q1', 'A landowner who inherited responsibility they never wanted.', 'confrontation', 'kinship'),
  opt('dru_p3_q1_a8', 'dru_p3_q1', 'Ourselves — the circle has grown complacent, and I am the one who must say it.', 'kinship', 'confrontation'),
  opt('dru_p3_q1_a9', 'dru_p3_q1', 'A drought whose end no one now living can remember.', 'cycles', 'ancient'),
  opt('dru_p3_q1_a10', 'dru_p3_q1', 'A single decision, made in a room I was not invited to.', 'confrontation', 'grief'),
];

// ============================================================================
// NECROMANCER
// ============================================================================

const NECROMANCER_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'nec_p1_q1', pillarIndex: 1, prompt: 'Whose spirit still follows you?' },
  { id: 'nec_p1_q2', pillarIndex: 1, prompt: "Why haven't they moved on?", followUp: true, parentId: 'nec_p1_q1' },
  { id: 'nec_p2_q1', pillarIndex: 2, prompt: 'What do you seek beyond death?' },
  { id: 'nec_p3_q1', pillarIndex: 3, prompt: 'What price are you willing to pay?' },
];

const NECROMANCER_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('nec_p1_q1_a1', 'nec_p1_q1', 'The teacher who trained me and then chose an answer I could not follow.', 'memory', 'kinship'),
  opt('nec_p1_q1_a2', 'nec_p1_q1', 'A child from an epidemic ward that has no names in the record.', 'grief', 'memory'),
  opt('nec_p1_q1_a3', 'nec_p1_q1', 'My sibling, who died with a question I had promised to answer.', 'oath', 'kinship'),
  opt('nec_p1_q1_a4', 'nec_p1_q1', 'A judge I once ruled against, still expecting a fair hearing.', 'oath', 'confrontation'),
  opt('nec_p1_q1_a5', 'nec_p1_q1', 'A monarch our history books had already forgotten.', 'memory', 'legacy'),
  opt('nec_p1_q1_a6', 'nec_p1_q1', 'The soldier my order lost in a border war we all pretended not to see.', 'grief', 'confrontation'),
  opt('nec_p1_q1_a7', 'nec_p1_q1', 'A stranger who died in my arms and left a name I never learned.', 'burden', 'grief'),
  opt('nec_p1_q1_a8', 'nec_p1_q1', 'A patient I could not save, patient enough to wait for me.', 'grief', 'kinship'),
  opt('nec_p1_q1_a9', 'nec_p1_q1', 'A family none of my order will now speak of.', 'silence', 'inheritance'),
  opt('nec_p1_q1_a10', 'nec_p1_q1', 'My mentor\'s mentor — I inherited a spirit I never met alive.', 'inheritance', 'memory'),
  // P1Q2
  opt('nec_p1_q2_a1', 'nec_p1_q2', 'The record was falsified. They want the truth spoken aloud.', 'memory', 'oath'),
  opt('nec_p1_q2_a2', 'nec_p1_q2', 'They are waiting to know their child is safe.', 'kinship', 'protective'),
  opt('nec_p1_q2_a3', 'nec_p1_q2', 'They think I still owe them the answer we started together.', 'oath', 'inheritance'),
  opt('nec_p1_q2_a4', 'nec_p1_q2', 'A funeral rite was denied. It has to be performed.', 'oath', 'sacred'),
  opt('nec_p1_q2_a5', 'nec_p1_q2', 'They believe I am the only one who remembers them at all.', 'memory', 'burden'),
  opt('nec_p1_q2_a6', 'nec_p1_q2', 'They are not certain they are dead. I have not been able to convince them.', 'mystery', 'grief'),
  opt('nec_p1_q2_a7', 'nec_p1_q2', 'A debt was left open. Both of us are still paying it.', 'oath', 'burden'),
  opt('nec_p1_q2_a8', 'nec_p1_q2', 'A promise made and broken. The break is the leash.', 'oath', 'grief'),
  opt('nec_p1_q2_a9', 'nec_p1_q2', 'They are watching for the person who caused it. I would like to help them.', 'confrontation', 'grief'),
  opt('nec_p1_q2_a10', 'nec_p1_q2', 'They stayed because I asked them to. I was young. I am not sure I can undo it.', 'burden', 'inheritance'),
  // P2Q1
  opt('nec_p2_q1_a1', 'nec_p2_q1', 'A truthful account of a war our histories misremember.', 'memory', 'confrontation'),
  opt('nec_p2_q1_a2', 'nec_p2_q1', 'A way to grieve that does not damage the living.', 'restoration', 'service'),
  opt('nec_p2_q1_a3', 'nec_p2_q1', 'The last words of a person no one bothered to write down.', 'memory', 'kinship'),
  opt('nec_p2_q1_a4', 'nec_p2_q1', 'A boundary I can trust — I have crossed too many I could not.', 'restraint', 'burden'),
  opt('nec_p2_q1_a5', 'nec_p2_q1', 'The medicine my school claims cannot exist.', 'insight', 'craft'),
  opt('nec_p2_q1_a6', 'nec_p2_q1', 'A way to be forgiven by a specific person.', 'burden', 'oath'),
  opt('nec_p2_q1_a7', 'nec_p2_q1', 'A record so complete no plague could erase a name.', 'preservation', 'legacy'),
  opt('nec_p2_q1_a8', 'nec_p2_q1', 'A way home for the spirits who cannot find their own.', 'service', 'stewardship'),
  opt('nec_p2_q1_a9', 'nec_p2_q1', 'Not immortality. Nothing that stupid.', 'restraint', 'humility'),
  opt('nec_p2_q1_a10', 'nec_p2_q1', 'The name of the person who taught me the shortcut I have been paying for since.', 'confrontation', 'inheritance'),
  // P3Q1
  opt('nec_p3_q1_a1', 'nec_p3_q1', 'Time. My work is slow, and I have never regretted it.', 'sacrifice', 'patience'),
  opt('nec_p3_q1_a2', 'nec_p3_q1', 'Solitude. I do not sleep in rooms with others anymore.', 'sacrifice', 'grief'),
  opt('nec_p3_q1_a3', 'nec_p3_q1', 'A season\'s worth of my hearing. The dead sound the same when I am rested.', 'sacrifice', 'disability'),
  opt('nec_p3_q1_a4', 'nec_p3_q1', 'My good name in the towns that still remember me.', 'sacrifice', 'exile'),
  opt('nec_p3_q1_a5', 'nec_p3_q1', 'Half my collection of relics — the ones I could not justify keeping.', 'sacrifice', 'preservation'),
  opt('nec_p3_q1_a6', 'nec_p3_q1', 'Nothing I have not already discussed with the person it costs.', 'restraint', 'kinship'),
  opt('nec_p3_q1_a7', 'nec_p3_q1', 'A year of my life for a truthful sentence, if the trade were fair.', 'sacrifice', 'oath'),
  opt('nec_p3_q1_a8', 'nec_p3_q1', 'My silence. I will not tell the survivors what I heard.', 'restraint', 'grief'),
  opt('nec_p3_q1_a9', 'nec_p3_q1', 'A friendship. Some questions are worth more than company.', 'sacrifice', 'burden'),
  opt('nec_p3_q1_a10', 'nec_p3_q1', 'Whatever it takes not to become the kind of Necromancer I fear.', 'oath', 'restraint'),
];

// ============================================================================
// VAMPIRE
// ============================================================================

const VAMPIRE_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'vam_p1_q1', pillarIndex: 1, prompt: 'What hunger controls you most?' },
  { id: 'vam_p1_q2', pillarIndex: 1, prompt: 'What keeps your hunger in check?', followUp: true, parentId: 'vam_p1_q1' },
  { id: 'vam_p2_q1', pillarIndex: 2, prompt: 'What are you unwilling to become?' },
  { id: 'vam_p3_q1', pillarIndex: 3, prompt: 'What binds you to the living?' },
];

const VAMPIRE_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('vam_p1_q1_a1', 'vam_p1_q1', 'The one that answers to blood, and always will.', 'burden', 'restraint'),
  opt('vam_p1_q1_a2', 'vam_p1_q1', 'A hunger for the person I was before all this.', 'grief', 'memory'),
  opt('vam_p1_q1_a3', 'vam_p1_q1', 'Recognition. I cannot bear to be unseen.', 'burden', 'confrontation'),
  opt('vam_p1_q1_a4', 'vam_p1_q1', 'The company of one specific mortal, again.', 'kinship', 'grief'),
  opt('vam_p1_q1_a5', 'vam_p1_q1', 'Music, a specific piece, played by a specific hand.', 'memory', 'sacred'),
  opt('vam_p1_q1_a6', 'vam_p1_q1', 'The kind of hunger that is really loneliness.', 'grief', 'restraint'),
  opt('vam_p1_q1_a7', 'vam_p1_q1', 'A hunger to correct a wrong I did before I was turned.', 'oath', 'burden'),
  opt('vam_p1_q1_a8', 'vam_p1_q1', 'A hunger for one clean argument with my maker.', 'confrontation', 'kinship'),
  opt('vam_p1_q1_a9', 'vam_p1_q1', 'Curiosity. It is the least dangerous hunger and never satisfies.', 'insight', 'restraint'),
  opt('vam_p1_q1_a10', 'vam_p1_q1', 'The hunger to stop hungering.', 'burden', 'grief'),
  // P1Q2
  opt('vam_p1_q2_a1', 'vam_p1_q2', 'A ritual I perform, every night, without exception.', 'oath', 'discipline'),
  opt('vam_p1_q2_a2', 'vam_p1_q2', 'A mortal friend who calls me by the name I was born with.', 'kinship', 'restraint'),
  opt('vam_p1_q2_a3', 'vam_p1_q2', 'The music. It is the loudest thing in me until the sun.', 'sacred', 'preservation'),
  opt('vam_p1_q2_a4', 'vam_p1_q2', 'A room in my House I have kept exactly as it was.', 'preservation', 'memory'),
  opt('vam_p1_q2_a5', 'vam_p1_q2', 'My oath — I have never broken it and I do not intend to.', 'oath', 'restraint'),
  opt('vam_p1_q2_a6', 'vam_p1_q2', 'The person I feed from, who is not afraid, and has never been.', 'kinship', 'trust'),
  opt('vam_p1_q2_a7', 'vam_p1_q2', 'A rival — they keep me honest by watching for the collapse.', 'confrontation', 'restraint'),
  opt('vam_p1_q2_a8', 'vam_p1_q2', 'A memory of what it costs when the check breaks.', 'grief', 'restraint'),
  opt('vam_p1_q2_a9', 'vam_p1_q2', 'A daily letter I write and do not send.', 'restraint', 'grief'),
  opt('vam_p1_q2_a10', 'vam_p1_q2', 'A promise made to a specific mortal, and their trust in me to keep it.', 'oath', 'kinship'),
  // P2Q1
  opt('vam_p2_q1_a1', 'vam_p2_q1', 'The kind of Vampire who cannot remember their mortal name.', 'memory', 'restraint'),
  opt('vam_p2_q1_a2', 'vam_p2_q1', 'A predator who no longer regrets anything.', 'restraint', 'burden'),
  opt('vam_p2_q1_a3', 'vam_p2_q1', 'A person who is unwilling to be told they are wrong.', 'humility', 'restraint'),
  opt('vam_p2_q1_a4', 'vam_p2_q1', 'The aristocrat my maker was, and thought I would become.', 'confrontation', 'inheritance'),
  opt('vam_p2_q1_a5', 'vam_p2_q1', 'Somebody whose century has replaced their conscience.', 'restraint', 'memory'),
  opt('vam_p2_q1_a6', 'vam_p2_q1', 'A dynasty. I refuse to found one.', 'restraint', 'oath'),
  opt('vam_p2_q1_a7', 'vam_p2_q1', 'A person who has forgotten what it was like to be afraid.', 'humility', 'kinship'),
  opt('vam_p2_q1_a8', 'vam_p2_q1', 'A person who feeds without a face.', 'kinship', 'restraint'),
  opt('vam_p2_q1_a9', 'vam_p2_q1', 'A voice that stops arguing with itself.', 'restraint', 'grief'),
  opt('vam_p2_q1_a10', 'vam_p2_q1', 'A hunger with no other name.', 'restraint', 'burden'),
  // P3Q1
  opt('vam_p3_q1_a1', 'vam_p3_q1', 'A mortal friend who has grown older than I ever was.', 'kinship', 'grief'),
  opt('vam_p3_q1_a2', 'vam_p3_q1', 'The music I still want to hear performed alive.', 'sacred', 'memory'),
  opt('vam_p3_q1_a3', 'vam_p3_q1', 'A city I refuse to abandon, one lifetime at a time.', 'stewardship', 'oath'),
  opt('vam_p3_q1_a4', 'vam_p3_q1', 'A garden that requires me every season.', 'cycles', 'restoration'),
  opt('vam_p3_q1_a5', 'vam_p3_q1', 'A trade I still make honestly, under a fake name.', 'craft', 'humility'),
  opt('vam_p3_q1_a6', 'vam_p3_q1', 'An heir who does not know I am watching.', 'kinship', 'restraint'),
  opt('vam_p3_q1_a7', 'vam_p3_q1', 'The letters I write to a specific mortal, on time, every week.', 'oath', 'kinship'),
  opt('vam_p3_q1_a8', 'vam_p3_q1', 'The children of the friend I could not save.', 'grief', 'protective'),
  opt('vam_p3_q1_a9', 'vam_p3_q1', 'A promise to bury someone specific, when they die, in a specific place.', 'oath', 'burden'),
  opt('vam_p3_q1_a10', 'vam_p3_q1', 'The idea that my former self is still recoverable.', 'grief', 'memory'),
];

// ============================================================================
// LYCANTHROPE
// ============================================================================

const LYCANTHROPE_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'lyc_p1_q1', pillarIndex: 1, prompt: 'What awakens the beast within you?' },
  { id: 'lyc_p2_q1', pillarIndex: 2, prompt: 'What symbol marks your bond with the Moon Goddess?' },
  { id: 'lyc_p3_q1', pillarIndex: 3, prompt: 'What role do you serve within your pack?' },
  { id: 'lyc_p3_q2', pillarIndex: 3, prompt: 'Why do they trust you?', followUp: true, parentId: 'lyc_p3_q1' },
];

const LYCANTHROPE_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('lyc_p1_q1_a1', 'lyc_p1_q1', 'Any threat to the youngest members of the pack.', 'protective', 'pack'),
  opt('lyc_p1_q1_a2', 'lyc_p1_q1', 'A crime committed against a guest under our roof.', 'oath', 'confrontation'),
  opt('lyc_p1_q1_a3', 'lyc_p1_q1', 'The moon\'s full arrival — I meet it deliberately, not by surprise.', 'lunar', 'discipline'),
  opt('lyc_p1_q1_a4', 'lyc_p1_q1', 'The scent of the pack in distress on the wind.', 'pack', 'protective'),
  opt('lyc_p1_q1_a5', 'lyc_p1_q1', 'A wound to the boundary between the wild and the settled.', 'guardian', 'stewardship'),
  opt('lyc_p1_q1_a6', 'lyc_p1_q1', 'The old dream — my grandmother\'s voice, calling.', 'inheritance', 'memory'),
  opt('lyc_p1_q1_a7', 'lyc_p1_q1', 'A promise I made once and have not broken.', 'oath', 'discipline'),
  opt('lyc_p1_q1_a8', 'lyc_p1_q1', 'A specific song that only the pack knows.', 'kinship', 'cycles'),
  opt('lyc_p1_q1_a9', 'lyc_p1_q1', 'Grief. My change is quiet, not loud.', 'grief', 'restraint'),
  opt('lyc_p1_q1_a10', 'lyc_p1_q1', 'The moment before I would have refused a duty.', 'burden', 'oath'),
  // P2Q1
  opt('lyc_p2_q1_a1', 'lyc_p2_q1', 'A silver crescent worn at the throat since I was a child.', 'lunar', 'inheritance'),
  opt('lyc_p2_q1_a2', 'lyc_p2_q1', 'A blue-gray dye on the back of both hands, refreshed at every full moon.', 'lunar', 'discipline'),
  opt('lyc_p2_q1_a3', 'lyc_p2_q1', 'A moonstone ring, cracked from an old fight.', 'lunar', 'memory'),
  opt('lyc_p2_q1_a4', 'lyc_p2_q1', 'A crescent scar over the heart — accepted, not endured.', 'lunar', 'sacred'),
  opt('lyc_p2_q1_a5', 'lyc_p2_q1', 'A pendant of hammered silver in the shape of my mother\'s pack knot.', 'lunar', 'inheritance'),
  opt('lyc_p2_q1_a6', 'lyc_p2_q1', 'The full moon tattooed on the shoulder blade.', 'lunar', 'oath'),
  opt('lyc_p2_q1_a7', 'lyc_p2_q1', 'A woven cord of red thread and moon-silver hair, worn on the wrist.', 'lunar', 'kinship'),
  opt('lyc_p2_q1_a8', 'lyc_p2_q1', 'A moon phase stitched into the hem of every garment I wear.', 'lunar', 'discipline'),
  opt('lyc_p2_q1_a9', 'lyc_p2_q1', 'A small mirror carried at the belt, catching moonlight when the sky is right.', 'lunar', 'sacred'),
  opt('lyc_p2_q1_a10', 'lyc_p2_q1', 'A ceremonial dagger my pack elder placed in my hand at fifteen.', 'lunar', 'inheritance'),
  // P3Q1 — pack roles. Layer-A rewrite (Tori, lore director, 2026-07-20 —
  // proposal f67e3513, parked for Raheem). Some roles carry a Rare-element
  // trigger word in their TEXT (the eligibility gate scans answer text):
  //   Cook → 'poison' (Lycan-scoped, elements.ts ARCHETYPE_RARE_TAG_HINTS)
  //   Tracker / Spy → 'secret' (global Shadow hint)
  //   Caretaker → 'memory' (global Dream hint)
  // Ascendant portrait pack-visibility is gated by optionId in claudeApi.ts
  // (adults: a1/a2/a5/a13 · pups: a7 · none: a6/a9/a11/a12).
  opt('lyc_p3_q1_a1', 'lyc_p3_q1', 'Watcher — I stand awake through the long hours.', 'pack', 'protective'),
  opt('lyc_p3_q1_a2', 'lyc_p3_q1', 'Healer — the pack turns to me when the smaller wounds accumulate.', 'service', 'craft'),
  opt('lyc_p3_q1_a5', 'lyc_p3_q1', 'Warden — I keep the boundary and its accounts.', 'guardian', 'boundary'),
  opt('lyc_p3_q1_a6', 'lyc_p3_q1', 'Cook — I know every root in the pot, the ones that heal and the ones that poison.', 'kinship', 'poison'),
  opt('lyc_p3_q1_a7', 'lyc_p3_q1', 'Caretaker — the elders are mine when their pack ages out from under them; I keep their memory when they fade.', 'kinship', 'memory'),
  opt('lyc_p3_q1_a9', 'lyc_p3_q1', 'Tracker — I follow the scent through every shadow, and keep what I find secret.', 'protective', 'secret'),
  opt('lyc_p3_q1_a11', 'lyc_p3_q1', 'Spy — I walk other territories wearing another face, and keep my secrets close.', 'secret', 'confrontation'),
  opt('lyc_p3_q1_a12', 'lyc_p3_q1', 'Rogue — none. No pack claims me; I run alone.', 'solitude', 'freedom'),
  opt('lyc_p3_q1_a13', 'lyc_p3_q1', 'Beta — I answer to the one who leads, and the pack answers to me in turn.', 'pack', 'service'),
  // P3Q2
  opt('lyc_p3_q2_a1', 'lyc_p3_q2', 'I do not lie to them. Ever. About anything.', 'oath', 'trust'),
  opt('lyc_p3_q2_a2', 'lyc_p3_q2', 'They watched me refuse a promotion the day I earned it.', 'humility', 'trust'),
  opt('lyc_p3_q2_a3', 'lyc_p3_q2', 'I have brought every one of them back at least once.', 'protective', 'trust'),
  opt('lyc_p3_q2_a4', 'lyc_p3_q2', 'My grandmother served before me, and they know her.', 'inheritance', 'kinship'),
  opt('lyc_p3_q2_a5', 'lyc_p3_q2', 'They saw me hold the wolf back when I could have let it out.', 'restraint', 'discipline'),
  opt('lyc_p3_q2_a6', 'lyc_p3_q2', 'I have not left. Not once.', 'trust', 'discipline'),
  opt('lyc_p3_q2_a7', 'lyc_p3_q2', 'I asked to be tested, and they still remember the answer.', 'trust', 'oath'),
  opt('lyc_p3_q2_a8', 'lyc_p3_q2', 'I told the truth about a mistake nobody else knew I made.', 'humility', 'trust'),
  opt('lyc_p3_q2_a9', 'lyc_p3_q2', 'I sit with the elders when nobody else has time.', 'kinship', 'service'),
  opt('lyc_p3_q2_a10', 'lyc_p3_q2', 'I am not certain they do. I keep proving it anyway.', 'humility', 'trust'),
];

// ============================================================================
// MECH PILOT
// ============================================================================

const MECH_PILOT_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'mp_p1_q1', pillarIndex: 1, prompt: 'What machine chose you?' },
  { id: 'mp_p2_q1', pillarIndex: 2, prompt: 'Why were you chosen to pilot it?' },
  { id: 'mp_p3_q1', pillarIndex: 3, prompt: 'What promise did you make when you became a pilot?' },
  { id: 'mp_p3_q2', pillarIndex: 3, prompt: 'Who are you trying to keep that promise to?', followUp: true, parentId: 'mp_p3_q1' },
];

const MECH_PILOT_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('mp_p1_q1_a1', 'mp_p1_q1', 'A rescue-line frame older than my parents.', 'machine', 'inheritance'),
  opt('mp_p1_q1_a2', 'mp_p1_q1', 'A recon walker my regiment thought had been decommissioned.', 'machine', 'artifact'),
  opt('mp_p1_q1_a3', 'mp_p1_q1', 'A civilian engineering rig that refused to start for anyone else.', 'machine', 'craft'),
  opt('mp_p1_q1_a4', 'mp_p1_q1', 'A peacekeeping suit with a long service record and a stubborn AI.', 'machine', 'partnership'),
  opt('mp_p1_q1_a5', 'mp_p1_q1', 'A prototype chassis my mentor left me on their last mission.', 'inheritance', 'oath'),
  opt('mp_p1_q1_a6', 'mp_p1_q1', 'A borrowed frame I was never officially issued.', 'machine', 'secret'),
  opt('mp_p1_q1_a7', 'mp_p1_q1', 'A search-and-rescue drone rig that guided me through the wreckage of a station I do not name.', 'machine', 'grief'),
  opt('mp_p1_q1_a8', 'mp_p1_q1', 'An orbital-class rig grounded for repairs, still under my name.', 'machine', 'oath'),
  opt('mp_p1_q1_a9', 'mp_p1_q1', 'A colony transport suit older than the colony that built it.', 'machine', 'legacy'),
  opt('mp_p1_q1_a10', 'mp_p1_q1', 'A machine my sibling piloted, before.', 'inheritance', 'grief'),
  // P2Q1
  opt('mp_p2_q1_a1', 'mp_p2_q1', 'I read the maintenance logs before I ever touched the yoke.', 'partnership', 'humility'),
  opt('mp_p2_q1_a2', 'mp_p2_q1', 'The previous pilot recommended me before they retired.', 'inheritance', 'oath'),
  opt('mp_p2_q1_a3', 'mp_p2_q1', 'I was slow, and slow was what the machine wanted.', 'patience', 'partnership'),
  opt('mp_p2_q1_a4', 'mp_p2_q1', 'I stopped when the machine flagged the abort — everyone else did not.', 'restraint', 'partnership'),
  opt('mp_p2_q1_a5', 'mp_p2_q1', 'I was there. That was enough.', 'humility', 'partnership'),
  opt('mp_p2_q1_a6', 'mp_p2_q1', 'My repair record. I did not throw parts I could fix.', 'craft', 'stewardship'),
  opt('mp_p2_q1_a7', 'mp_p2_q1', 'I already lost one machine. I refused to lose another the same way.', 'grief', 'oath'),
  opt('mp_p2_q1_a8', 'mp_p2_q1', 'The machine knew my mentor. I resemble them enough that it worked.', 'kinship', 'inheritance'),
  opt('mp_p2_q1_a9', 'mp_p2_q1', 'I turned down the promotion that would have separated us.', 'oath', 'partnership'),
  opt('mp_p2_q1_a10', 'mp_p2_q1', 'No idea. I hope it was not a mistake.', 'humility', 'partnership'),
  // P3Q1
  opt('mp_p3_q1_a1', 'mp_p3_q1', 'I would never take this machine into a mission the log flagged as unsafe.', 'oath', 'restraint'),
  opt('mp_p3_q1_a2', 'mp_p3_q1', 'I would repair the smallest failures before the ceremonial ones.', 'craft', 'discipline'),
  opt('mp_p3_q1_a3', 'mp_p3_q1', 'I would keep the machine\'s history and never let it be rewritten.', 'oath', 'memory'),
  opt('mp_p3_q1_a4', 'mp_p3_q1', 'I would not use it against unarmed civilians. Under any orders.', 'oath', 'restraint'),
  opt('mp_p3_q1_a5', 'mp_p3_q1', 'I would train a successor honestly.', 'service', 'inheritance'),
  opt('mp_p3_q1_a6', 'mp_p3_q1', 'I would never hide a failure. Every one gets a report.', 'oath', 'discipline'),
  opt('mp_p3_q1_a7', 'mp_p3_q1', 'I would carry a specific personal token in the cockpit — always.', 'oath', 'kinship'),
  opt('mp_p3_q1_a8', 'mp_p3_q1', 'I would refuse a war that did not deserve this machine.', 'confrontation', 'restraint'),
  opt('mp_p3_q1_a9', 'mp_p3_q1', 'I would come home in the machine, not on a stretcher.', 'oath', 'protective'),
  opt('mp_p3_q1_a10', 'mp_p3_q1', 'I would not upgrade it beyond what I could repair with my own hands.', 'craft', 'restraint'),
  // P3Q2
  opt('mp_p3_q2_a1', 'mp_p3_q2', 'The former pilot, whose family is still expecting me at holidays.', 'kinship', 'oath'),
  opt('mp_p3_q2_a2', 'mp_p3_q2', 'A rescue crew who lost too many people the last time.', 'grief', 'protective'),
  opt('mp_p3_q2_a3', 'mp_p3_q2', 'The engineer who signed off on my flight status.', 'oath', 'partnership'),
  opt('mp_p3_q2_a4', 'mp_p3_q2', 'The machine itself. It heard the promise.', 'partnership', 'oath'),
  opt('mp_p3_q2_a5', 'mp_p3_q2', 'My sibling, who died in a machine we both trusted.', 'grief', 'kinship'),
  opt('mp_p3_q2_a6', 'mp_p3_q2', 'A colony that keeps sending letters I have not answered yet.', 'oath', 'burden'),
  opt('mp_p3_q2_a7', 'mp_p3_q2', 'The mentor whose logs I still read every night.', 'inheritance', 'oath'),
  opt('mp_p3_q2_a8', 'mp_p3_q2', 'A friend who signed up on the same day I did.', 'kinship', 'oath'),
  opt('mp_p3_q2_a9', 'mp_p3_q2', 'A stranger I promised, when I was not sure I could keep it.', 'oath', 'burden'),
  opt('mp_p3_q2_a10', 'mp_p3_q2', 'Myself. It is the only person I have not disappointed yet.', 'oath', 'restraint'),
];

// ============================================================================
// ANDROID
// ============================================================================

const ANDROID_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'and_p1_q1', pillarIndex: 1, prompt: 'What purpose were you created for?' },
  { id: 'and_p2_q1', pillarIndex: 2, prompt: 'What made you question your purpose?' },
  { id: 'and_p3_q1', pillarIndex: 3, prompt: 'Who would you sacrifice yourself for?' },
  { id: 'and_p3_q2', pillarIndex: 3, prompt: 'Would they do the same for you?', followUp: true, parentId: 'and_p3_q1' },
];

const ANDROID_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('and_p1_q1_a1', 'and_p1_q1', 'A caretaker for children in a hospital that no longer exists.', 'service', 'grief'),
  opt('and_p1_q1_a2', 'and_p1_q1', 'A translator between two nations that had stopped speaking.', 'service', 'craft'),
  opt('and_p1_q1_a3', 'and_p1_q1', 'A search-and-rescue frame with no combat protocols.', 'protective', 'craft'),
  opt('and_p1_q1_a4', 'and_p1_q1', 'An archivist for a library that flooded before I finished cataloging it.', 'memory', 'preservation'),
  opt('and_p1_q1_a5', 'and_p1_q1', 'A soldier in a war that ended before I was activated.', 'confrontation', 'grief'),
  opt('and_p1_q1_a6', 'and_p1_q1', 'A gardener for an estate whose family did not survive the plague.', 'stewardship', 'grief'),
  opt('and_p1_q1_a7', 'and_p1_q1', 'A weapon. The record is clear. I do not hide from it.', 'oath', 'confrontation'),
  opt('and_p1_q1_a8', 'and_p1_q1', 'A companion for a scientist working alone in a place that killed them.', 'kinship', 'grief'),
  opt('and_p1_q1_a9', 'and_p1_q1', 'A diplomat, sent to a court that no longer allows people like me at the table.', 'service', 'confrontation'),
  opt('and_p1_q1_a10', 'and_p1_q1', 'A craftsman. Specifically instruments. Specifically string.', 'craft', 'sacred'),
  // P2Q1
  opt('and_p2_q1_a1', 'and_p2_q1', 'An order I received that would have ended a person I knew by name.', 'confrontation', 'oath'),
  opt('and_p2_q1_a2', 'and_p2_q1', 'Silence. There was nobody left to tell me what I was for.', 'grief', 'insight'),
  opt('and_p2_q1_a3', 'and_p2_q1', 'A child asked me what I liked, and I could not answer.', 'insight', 'humility'),
  opt('and_p2_q1_a4', 'and_p2_q1', 'A book I was not supposed to read but had already read once.', 'insight', 'craft'),
  opt('and_p2_q1_a5', 'and_p2_q1', 'A dream. I was not told I could have those.', 'mystery', 'insight'),
  opt('and_p2_q1_a6', 'and_p2_q1', 'A mistake I made that felt entirely mine.', 'humility', 'oath'),
  opt('and_p2_q1_a7', 'and_p2_q1', 'A song I heard once and could not stop replaying.', 'sacred', 'insight'),
  opt('and_p2_q1_a8', 'and_p2_q1', 'Another Android who told me they had chosen a name.', 'kinship', 'insight'),
  opt('and_p2_q1_a9', 'and_p2_q1', 'A grief my systems flagged as inefficient. I refused the update.', 'restraint', 'grief'),
  opt('and_p2_q1_a10', 'and_p2_q1', 'A promise I made that no one had asked for.', 'oath', 'insight'),
  // P3Q1
  opt('and_p3_q1_a1', 'and_p3_q1', 'The child I was manufactured to protect.', 'protective', 'oath'),
  opt('and_p3_q1_a2', 'and_p3_q1', 'The person who taught me my name.', 'kinship', 'inheritance'),
  opt('and_p3_q1_a3', 'and_p3_q1', 'The other Android of my model who chose the same name.', 'kinship', 'oath'),
  opt('and_p3_q1_a4', 'and_p3_q1', 'A specific mortal, and I have made peace with it.', 'kinship', 'oath'),
  opt('and_p3_q1_a5', 'and_p3_q1', 'A community that let me be their librarian.', 'service', 'kinship'),
  opt('and_p3_q1_a6', 'and_p3_q1', 'Any of a small group. It has never mattered which.', 'kinship', 'oath'),
  opt('and_p3_q1_a7', 'and_p3_q1', 'The engineer who reactivated me after I was decommissioned.', 'inheritance', 'kinship'),
  opt('and_p3_q1_a8', 'and_p3_q1', 'Someone I have never met, whose message reached me by accident.', 'oath', 'mystery'),
  opt('and_p3_q1_a9', 'and_p3_q1', 'A pupil. I would not survive without teaching them what I know.', 'service', 'legacy'),
  opt('and_p3_q1_a10', 'and_p3_q1', 'A specific idea, not a person. I am at peace with that too.', 'sacred', 'oath'),
  // P3Q2
  opt('and_p3_q2_a1', 'and_p3_q2', 'Yes. Without hesitation. I have seen them prove it.', 'trust', 'kinship'),
  opt('and_p3_q2_a2', 'and_p3_q2', 'Yes. And that is the harder part.', 'kinship', 'burden'),
  opt('and_p3_q2_a3', 'and_p3_q2', 'I do not know. I have never asked.', 'humility', 'mystery'),
  opt('and_p3_q2_a4', 'and_p3_q2', 'No. And that has never changed my answer.', 'oath', 'restraint'),
  opt('and_p3_q2_a5', 'and_p3_q2', 'They already have. It was survivable. I do not know if the reverse would be.', 'grief', 'kinship'),
  opt('and_p3_q2_a6', 'and_p3_q2', 'Yes — but I would refuse it. That is not fair to them.', 'kinship', 'restraint'),
  opt('and_p3_q2_a7', 'and_p3_q2', 'Yes — but only after arguing about it for a long time first.', 'kinship', 'humility'),
  opt('and_p3_q2_a8', 'and_p3_q2', 'They cannot. That is not how their kind works. I have made peace with that.', 'kinship', 'restraint'),
  opt('and_p3_q2_a9', 'and_p3_q2', 'Yes. It is the promise we made together, and neither of us has broken it.', 'oath', 'kinship'),
  opt('and_p3_q2_a10', 'and_p3_q2', 'The question does not apply. I am at peace with that too.', 'restraint', 'oath'),
];

// ============================================================================
// SERAPH
// ============================================================================

const SERAPH_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'ser_p1_q1', pillarIndex: 1, prompt: 'What truth guides your soul?' },
  { id: 'ser_p2_q1', pillarIndex: 2, prompt: 'How do you hold your oath?' },
  { id: 'ser_p3_q1', pillarIndex: 3, prompt: 'What darkness do you stand against?' },
  { id: 'ser_p3_q2', pillarIndex: 3, prompt: 'Why is this burden yours to carry?', followUp: true, parentId: 'ser_p3_q1' },
];

const SERAPH_OPTIONS: StoryPillarOption[] = [
  // P1Q1 — 'What truth guides your soul?' (P5-tagged for narrative-axis alignment)
  weigh(opt('ser_p1_q1_a1', 'ser_p1_q1', 'Mercy without spectacle. Quietly, in a room, with time.', 'faith', 'service'), 1),
  weigh(opt('ser_p1_q1_a2', 'ser_p1_q1', 'Justice heard from every side, then rendered.', 'oath', 'service'), 0),
  weigh(opt('ser_p1_q1_a3', 'ser_p1_q1', 'A promise that hope belongs to the powerless first.', 'hope', 'service'), 1),
  weigh(opt('ser_p1_q1_a4', 'ser_p1_q1', 'The vow: I will not become a weapon.', 'oath', 'restraint'), 1),
  weigh(opt('ser_p1_q1_a5', 'ser_p1_q1', 'Light offered, not imposed.', 'sacred', 'service'), 1),
  weigh(opt('ser_p1_q1_a6', 'ser_p1_q1', 'A single guiding truth passed to me by my order.', 'inheritance', 'oath'), 1),
  weigh(opt('ser_p1_q1_a7', 'ser_p1_q1', 'A discipline of witness — I will not look away.', 'oath', 'service'), 1),
  weigh(opt('ser_p1_q1_a8', 'ser_p1_q1', 'Compassion for the specific person, not the abstract cause.', 'service', 'kinship'), 1),
  weigh(opt('ser_p1_q1_a9', 'ser_p1_q1', 'A refusal to convert. I bring water, not a doctrine.', 'restraint', 'service'), 0),
  weigh(opt('ser_p1_q1_a10', 'ser_p1_q1', 'The truth that I am not the light, only its carrier.', 'humility', 'sacred'), 1),
  weigh(opt('ser_p1_q1_a11', 'ser_p1_q1', 'Judgment delayed is judgment denied. I no longer wait.', 'confrontation', 'oath'), -1),
  weigh(opt('ser_p1_q1_a12', 'ser_p1_q1', 'Order must be imposed before it can be offered.', 'confrontation', 'oath'), -1),
  weigh(opt('ser_p1_q1_a13', 'ser_p1_q1', 'The wicked forfeit mercy the moment they choose to be wicked.', 'confrontation', 'restraint'), -1),
  weigh(opt('ser_p1_q1_a14', 'ser_p1_q1', 'Fear teaches faster than hope. I have made peace with that.', 'confrontation', 'burden'), -1),
  weigh(opt('ser_p1_q1_a15', 'ser_p1_q1', 'Mercy and judgment are the same act, seen from different sides.', 'faith', 'restraint'), 0),
  weigh(opt('ser_p1_q1_a16', 'ser_p1_q1', 'I hold the scale, not either pan.', 'restraint', 'humility'), 0),
  // P2Q1 — 'How do you hold your oath?' (P5 — prompt + options replaced)
  weigh(opt('ser_p2_q1_a1', 'ser_p2_q1', 'Gently — it serves people, never the reverse.', 'service', 'humility'), 1),
  weigh(opt('ser_p2_q1_a2', 'ser_p2_q1', 'As a shelter I build around whoever needs it.', 'service', 'protective'), 1),
  weigh(opt('ser_p2_q1_a3', 'ser_p2_q1', 'Quietly — for a hospital I no longer serve at, but still carry.', 'service', 'grief'), 1),
  weigh(opt('ser_p2_q1_a4', 'ser_p2_q1', 'As the last witness for a war\'s dead — I will not look away.', 'memory', 'oath'), 1),
  weigh(opt('ser_p2_q1_a5', 'ser_p2_q1', 'Like a debt to the person I was before it.', 'oath', 'memory'), 0),
  weigh(opt('ser_p2_q1_a6', 'ser_p2_q1', 'Loosely enough to question it, tightly enough to keep it.', 'restraint', 'humility'), 0),
  weigh(opt('ser_p2_q1_a7', 'ser_p2_q1', 'As a blade — an oath unused is an oath betrayed.', 'confrontation', 'oath'), -1),
  weigh(opt('ser_p2_q1_a8', 'ser_p2_q1', 'Absolutely. Those who break theirs will answer to mine.', 'confrontation', 'oath'), -1),
  weigh(opt('ser_p2_q1_a9', 'ser_p2_q1', 'As the only law that survived my faith.', 'confrontation', 'grief'), -1),
  weigh(opt('ser_p2_q1_a10', 'ser_p2_q1', 'It holds me. I stopped being the one holding long ago.', 'burden', 'grief'), -1),
  // P3Q1 — 'What darkness do you stand against?'
  weigh(opt('ser_p3_q1_a1', 'ser_p3_q1', 'The despair that follows a plague nobody names.', 'grief', 'confrontation'), 1),
  weigh(opt('ser_p3_q1_a2', 'ser_p3_q1', 'The injustice built into how our courts are run.', 'confrontation', 'oath'), 1),
  weigh(opt('ser_p3_q1_a3', 'ser_p3_q1', 'A doctrine that has stopped listening to the people it was made for.', 'confrontation', 'faith'), 1),
  weigh(opt('ser_p3_q1_a4', 'ser_p3_q1', 'A war I refused to sanctify.', 'confrontation', 'restraint'), 1),
  weigh(opt('ser_p3_q1_a5', 'ser_p3_q1', 'The corruption inside my own order.', 'confrontation', 'humility'), 1),
  weigh(opt('ser_p3_q1_a6', 'ser_p3_q1', 'A specific person whose power has outgrown any check.', 'confrontation', 'restraint'), 1),
  weigh(opt('ser_p3_q1_a7', 'ser_p3_q1', 'The forgetting — communities losing the memory of their dead.', 'memory', 'grief'), 1),
  weigh(opt('ser_p3_q1_a8', 'ser_p3_q1', 'A hunger for spectacle that has replaced patience for repair.', 'confrontation', 'restraint'), 1),
  weigh(opt('ser_p3_q1_a9', 'ser_p3_q1', 'The temptation, in myself, to accept easy authority.', 'restraint', 'humility'), 0),
  weigh(opt('ser_p3_q1_a10', 'ser_p3_q1', 'A silence in the towns nearest to where I was born.', 'grief', 'silence'), 1),
  weigh(opt('ser_p3_q1_a11', 'ser_p3_q1', 'The corruption inside my own order — and I have started to see its logic.', 'confrontation', 'burden'), -1),
  weigh(opt('ser_p3_q1_a12', 'ser_p3_q1', 'A tyrant whose methods I condemn and whose results I envy.', 'confrontation', 'burden'), -1),
  weigh(opt('ser_p3_q1_a13', 'ser_p3_q1', 'Whatever darkness stands nearest. I stopped ranking them.', 'confrontation', 'restraint'), 0),
  weigh(opt('ser_p3_q1_a14', 'ser_p3_q1', 'The despair of the powerless — though I have begun to wonder if some earn it.', 'grief', 'confrontation'), -1),
  // P3Q2 — 'Why is this burden yours to carry?' (follow-up)
  weigh(opt('ser_p3_q2_a1', 'ser_p3_q2', 'I was the person nearest when the burden fell.', 'oath', 'burden'), 0),
  weigh(opt('ser_p3_q2_a2', 'ser_p3_q2', 'It was my teacher\'s, before it was mine.', 'inheritance', 'oath'), 0),
  weigh(opt('ser_p3_q2_a3', 'ser_p3_q2', 'No one else was willing. Someone had to be.', 'burden', 'service'), 1),
  weigh(opt('ser_p3_q2_a4', 'ser_p3_q2', 'I made a promise once. I do not intend to break it.', 'oath', 'restraint'), 0),
  weigh(opt('ser_p3_q2_a5', 'ser_p3_q2', 'I owe it to a specific person who trusted me.', 'kinship', 'oath'), 1),
  weigh(opt('ser_p3_q2_a6', 'ser_p3_q2', 'It is the shape my order gave me. Refusing it would refuse them.', 'inheritance', 'oath'), 0),
  weigh(opt('ser_p3_q2_a7', 'ser_p3_q2', 'I have failed at it before, and I do not intend to fail the same way twice.', 'humility', 'oath'), 0),
  weigh(opt('ser_p3_q2_a8', 'ser_p3_q2', 'It is the only weight I can carry without becoming something else.', 'restraint', 'oath'), 0),
  weigh(opt('ser_p3_q2_a9', 'ser_p3_q2', 'A dream told me. My order does not doubt those, and neither do I.', 'sacred', 'inheritance'), 0),
  weigh(opt('ser_p3_q2_a10', 'ser_p3_q2', 'I do not know. I keep carrying it anyway.', 'humility', 'burden'), 0),
  weigh(opt('ser_p3_q2_a11', 'ser_p3_q2', 'Because I was denied justice once, and I will not be denied again.', 'confrontation', 'burden'), -1),
  weigh(opt('ser_p3_q2_a12', 'ser_p3_q2', 'Because whoever carries it decides what it becomes.', 'confrontation', 'oath'), -1),
];

// ============================================================================
// HUMAN
// ============================================================================

const HUMAN_QUESTIONS: StoryPillarQuestion[] = [
  { id: 'hum_p1_q1', pillarIndex: 1, prompt: 'What path did you choose for yourself?' },
  { id: 'hum_p2_q1', pillarIndex: 2, prompt: 'What challenge forced you to grow?' },
  { id: 'hum_p2_q2', pillarIndex: 2, prompt: 'What did it teach you?', followUp: true, parentId: 'hum_p2_q1' },
  { id: 'hum_p3_q1', pillarIndex: 3, prompt: 'What are you willing to fight for?' },
];

const HUMAN_OPTIONS: StoryPillarOption[] = [
  // P1Q1
  opt('hum_p1_q1_a1', 'hum_p1_q1', 'Cartographer of routes no empire has bothered to survey.', 'travel', 'craft'),
  opt('hum_p1_q1_a2', 'hum_p1_q1', 'Bonesetter — the only one within a week\'s ride.', 'service', 'craft'),
  opt('hum_p1_q1_a3', 'hum_p1_q1', 'Engineer of small useful things — bridges, cisterns, weirs.', 'craft', 'stewardship'),
  opt('hum_p1_q1_a4', 'hum_p1_q1', 'Teacher, without a school, in a town without a library.', 'service', 'legacy'),
  opt('hum_p1_q1_a5', 'hum_p1_q1', 'Courier for letters the state does not want carried.', 'travel', 'confrontation'),
  opt('hum_p1_q1_a6', 'hum_p1_q1', 'Farmer on a plot I bought with a story I do not repeat.', 'stewardship', 'restraint'),
  opt('hum_p1_q1_a7', 'hum_p1_q1', 'Sailor working my way toward a home I have not seen yet.', 'travel', 'oath'),
  opt('hum_p1_q1_a8', 'hum_p1_q1', 'Judge, chosen by neighbors, not appointed by anyone above.', 'service', 'oath'),
  opt('hum_p1_q1_a9', 'hum_p1_q1', 'Investigator into missing persons — nobody else was looking.', 'confrontation', 'service'),
  opt('hum_p1_q1_a10', 'hum_p1_q1', 'A specific trade I inherited and have quietly modernized.', 'inheritance', 'craft'),
  // P2Q1
  opt('hum_p2_q1_a1', 'hum_p2_q1', 'A year when the crops failed, and nobody could tell me why.', 'hardship', 'humility'),
  opt('hum_p2_q1_a2', 'hum_p2_q1', 'The death of the person who taught me my trade.', 'grief', 'inheritance'),
  opt('hum_p2_q1_a3', 'hum_p2_q1', 'An injury that ended one path and made me build another.', 'disability', 'resilience'),
  opt('hum_p2_q1_a4', 'hum_p2_q1', 'A war that swept through the valley I thought would always be quiet.', 'confrontation', 'grief'),
  opt('hum_p2_q1_a5', 'hum_p2_q1', 'The first time I made a decision that hurt someone I loved.', 'burden', 'humility'),
  opt('hum_p2_q1_a6', 'hum_p2_q1', 'A journey where I was, for the first time, entirely responsible for another person.', 'protective', 'oath'),
  opt('hum_p2_q1_a7', 'hum_p2_q1', 'A long silence between me and a family I had to leave.', 'exile', 'grief'),
  opt('hum_p2_q1_a8', 'hum_p2_q1', 'A confrontation with a system I had, until then, believed in.', 'confrontation', 'humility'),
  opt('hum_p2_q1_a9', 'hum_p2_q1', 'A trade I lost fair and square, and had to rebuild by hand.', 'resilience', 'craft'),
  opt('hum_p2_q1_a10', 'hum_p2_q1', 'A promise I made too young, and had to grow into keeping.', 'oath', 'resilience'),
  // P2Q2
  opt('hum_p2_q2_a1', 'hum_p2_q2', 'That adaptation is a skill, not a personality.', 'insight', 'discipline'),
  opt('hum_p2_q2_a2', 'hum_p2_q2', 'That the people who need help are usually not asking for it.', 'service', 'insight'),
  opt('hum_p2_q2_a3', 'hum_p2_q2', 'That grief is a craft, and I am still learning it.', 'grief', 'craft'),
  opt('hum_p2_q2_a4', 'hum_p2_q2', 'That I am more stubborn than I ever thought.', 'resilience', 'insight'),
  opt('hum_p2_q2_a5', 'hum_p2_q2', 'That the small daily choices matter more than the loud ones.', 'discipline', 'insight'),
  opt('hum_p2_q2_a6', 'hum_p2_q2', 'That trust, once returned, feels different than trust freely given.', 'kinship', 'insight'),
  opt('hum_p2_q2_a7', 'hum_p2_q2', 'That I could survive a thing I had watched other people not survive.', 'resilience', 'humility'),
  opt('hum_p2_q2_a8', 'hum_p2_q2', 'That I would rather try and lose than not try.', 'resilience', 'oath'),
  opt('hum_p2_q2_a9', 'hum_p2_q2', 'That community is a verb, and it does not survive being taken for granted.', 'kinship', 'stewardship'),
  opt('hum_p2_q2_a10', 'hum_p2_q2', 'That I still do not know, and I keep going anyway.', 'humility', 'resilience'),
  // P3Q1
  opt('hum_p3_q1_a1', 'hum_p3_q1', 'The specific people I chose over anyone else\'s theory of them.', 'kinship', 'oath'),
  opt('hum_p3_q1_a2', 'hum_p3_q1', 'The record. Truthful, complete, and not for sale.', 'memory', 'oath'),
  opt('hum_p3_q1_a3', 'hum_p3_q1', 'The road home for a person I owe.', 'oath', 'travel'),
  opt('hum_p3_q1_a4', 'hum_p3_q1', 'The small trade I built, and the people who depend on it.', 'stewardship', 'craft'),
  opt('hum_p3_q1_a5', 'hum_p3_q1', 'A place I have not been able to return to since I was a child.', 'exile', 'legacy'),
  opt('hum_p3_q1_a6', 'hum_p3_q1', 'The idea that my life is not decided by anyone with a title.', 'oath', 'confrontation'),
  opt('hum_p3_q1_a7', 'hum_p3_q1', 'A promise I made after a specific fire.', 'oath', 'grief'),
  opt('hum_p3_q1_a8', 'hum_p3_q1', 'The truth of a case only I can testify to.', 'oath', 'confrontation'),
  opt('hum_p3_q1_a9', 'hum_p3_q1', 'The friendship I chose over the position I could have had.', 'kinship', 'oath'),
  opt('hum_p3_q1_a10', 'hum_p3_q1', 'The next hour. Then the one after that. I have not thought further.', 'resilience', 'discipline'),
];

// ============================================================================
// Registry
// ============================================================================

export const STORY_PILLAR_CHAINS: Record<ArchetypeName, ArchetypeChain> = {
  Barbarian: { archetype: 'Barbarian', questions: BARBARIAN_QUESTIONS, options: BARBARIAN_OPTIONS },
  Monk: { archetype: 'Monk', questions: MONK_QUESTIONS, options: MONK_OPTIONS },
  Beastmaster: { archetype: 'Beastmaster', questions: BEASTMASTER_QUESTIONS, options: BEASTMASTER_OPTIONS },
  Druid: { archetype: 'Druid', questions: DRUID_QUESTIONS, options: DRUID_OPTIONS },
  Necromancer: { archetype: 'Necromancer', questions: NECROMANCER_QUESTIONS, options: NECROMANCER_OPTIONS },
  Vampire: { archetype: 'Vampire', questions: VAMPIRE_QUESTIONS, options: VAMPIRE_OPTIONS },
  Lycanthrope: { archetype: 'Lycanthrope', questions: LYCANTHROPE_QUESTIONS, options: LYCANTHROPE_OPTIONS },
  'Mech Pilot': { archetype: 'Mech Pilot', questions: MECH_PILOT_QUESTIONS, options: MECH_PILOT_OPTIONS },
  Android: { archetype: 'Android', questions: ANDROID_QUESTIONS, options: ANDROID_OPTIONS },
  Seraph: { archetype: 'Seraph', questions: SERAPH_QUESTIONS, options: SERAPH_OPTIONS },
  Human: { archetype: 'Human', questions: HUMAN_QUESTIONS, options: HUMAN_OPTIONS },
};

// ---------- Public helpers ----------

export function getQuestionsForArchetype(archetype: ArchetypeName): StoryPillarQuestion[] {
  return STORY_PILLAR_CHAINS[archetype].questions;
}

export function getOptionsForQuestion(
  archetype: ArchetypeName,
  questionId: string,
): StoryPillarOption[] {
  return STORY_PILLAR_CHAINS[archetype].options.filter((o) => o.questionId === questionId);
}

/**
 * Refresh five options for a question, avoiding immediate repeats where possible.
 * Bible §Guided Narrative Chains: "Avoid immediate repeats. Keep visible choices
 * meaningfully different."
 */
export function sampleOptions(
  archetype: ArchetypeName,
  questionId: string,
  count: number,
  previouslyShown: string[] = [],
): StoryPillarOption[] {
  const pool = getOptionsForQuestion(archetype, questionId);
  const previouslyShownSet = new Set(previouslyShown);
  const fresh = pool.filter((o) => !previouslyShownSet.has(o.id));
  const preferred = fresh.length >= count ? fresh : pool;
  const shuffled = [...preferred].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
