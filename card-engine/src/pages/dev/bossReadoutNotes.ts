/**
 * Design rationale for the boss readout.
 *
 * Everything the readout can DERIVE — damage, cooldowns, scope, charge specs,
 * how often a move actually fires, how much of the fight's damage it accounts
 * for — is read from the boss data and the live simulation. This file holds
 * only what no amount of data can recover: why the move exists, what it is
 * asking the player to notice, and what it costs the boss to throw.
 *
 * Keyed by action id. A boss with no entry still renders — it just shows its
 * numbers without the commentary, which is the honest presentation for a boss
 * nobody has written up yet.
 */

export interface ActionNote {
  /** What the move is FOR, in one line. */
  role: string;
  /** Why it fires when it fires. */
  timing: string;
  /** What the party can do about it. */
  answer: string;
}

export interface BossNote {
  /** The fight in a paragraph — the thesis the moves are all serving. */
  thesis: string;
  /** The engine: how the moves combine into something more than their sum. */
  combo: string;
  /** Known weaknesses, stated plainly. A readout that only flatters is useless. */
  caveats: readonly string[];
  actions: Readonly<Record<string, ActionNote>>;
}

export const BOSS_NOTES: Readonly<Record<string, BossNote>> = {
  boss_champion_barbarian: {
    thesis:
      'He is not trying to kill you quickly. He is trying to put the whole party in reach at once, ' +
      'and then collect. Almost everything he throws is an area attack that hurts without killing — ' +
      'and then one move converts everyone he has softened into a corpse. The fight is a race between ' +
      'your healing and his arithmetic.',
    combo:
      'First Notice and Final Demand are one weapon in two halves. First Notice deals the most ' +
      'damage in the fight and kills nobody: its job is to push all three heroes under the execute ' +
      'threshold at the same time. Final Demand then hits the lowest-HP hero for more than double. ' +
      'Neither half is lethal alone. Together they end parties, and they arrive on cooldowns short ' +
      'enough to repeat. Everything else in the moveset is there to stop you from healing out of it.',
    caveats: [
      'A party that knows to brace two heroes under First Notice wins essentially every time. ' +
        'Solving the puzzle is supposed to be rewarded, but that is a very steep cliff.',
      'The Whole Ledger still under-delivers. Its charge fills with damage, which is what the party ' +
        'is doing anyway, so it is mostly suppressed for free — it taxes rather than threatens.',
      'The moveset was tuned against one scripted party. Real hero rosters with real elements will ' +
        'shift these numbers, and holy/shadow/tech parties should find it markedly easier.',
    ],
    actions: {
      act_debt_collect: {
        role: 'The basic attack, and the only move with no cooldown at all.',
        timing:
          'The fallback. It fires when nothing more interesting has come off cooldown, which is why ' +
          'it is the most-drawn filler in phase one.',
        answer:
          'Nothing special — it is deliberately the weakest thing he does. Seeing it should feel ' +
          'like a round you got back.',
      },
      act_debt_interest: {
        role: 'Chip damage to the whole party, plus a bleed that keeps ticking.',
        timing:
          'Every third round at most. It is the move that stops the party from banking health ' +
          'between the big ones.',
        answer:
          'Cleanse strips the bleed outright. Otherwise outpace it — the sweep itself is small, and ' +
          'the tick is what actually adds up.',
      },
      act_debt_seize: {
        role: 'Hunts whoever is currently weakest, and leaves them weaker.',
        timing:
          'Off cooldown every other round. It is the early-fight rehearsal for Final Demand: same ' +
          'targeting rule, survivable consequences.',
        answer:
          'Taunt. A hero holding taunt outranks the lowest-HP rule entirely, so a tank standing in ' +
          'front turns the snipe into an ordinary hit on the hero best equipped to take it.',
      },
      act_debt_tally: {
        role: 'Self power-up. He spends the whole turn and deals nothing.',
        timing:
          'Rare by design. Its value depends entirely on whether the rage is still up when the next ' +
          'ultimate lands, which is the read it is teaching.',
        answer:
          'It is a free round — use it. The mistake is treating it as a threat and playing safe ' +
          'through the one turn he was never going to hurt you.',
      },
      act_debt_first_notice: {
        role: 'Ultimate. The single biggest source of damage in the fight.',
        timing:
          'Fires the instant it is off cooldown — it is one of the three moves that is deliberately ' +
          'NOT random, so it can be planned around. Then it winds up for two rounds before landing.',
        answer:
          'Two heroes guarding in the same round break it outright. This is the only charge in the ' +
          'game broken by what the party DOES rather than by damage, so a party that can only hit ' +
          'things has no answer to it at all.',
      },
      act_debt_whole_sum: {
        role: 'The phase-two workhorse, and his hardest single-target hit.',
        timing: 'Near-permanent availability at one round of cooldown; the filler phase two falls back to.',
        answer:
          'Interruptible. Enough damage inside the round cancels it, which is the cheapest interrupt ' +
          'practice in the fight.',
      },
      act_debt_shield: {
        role: 'Absorb, and the counter-puzzle to a pure damage party.',
        timing:
          'Deliberately NOT scripted — it sits just below the threshold where moves become ' +
          'predictable, because its whole job is arriving after the party has committed to burst.',
        answer:
          'Wait it out, or spend the two rounds healing. While it holds, the party cannot get through ' +
          'to the interrupt bar underneath, so interrupts simply do not exist for two rounds.',
      },
      act_debt_ledger: {
        role: 'Ultimate. A party-wide hit that has to be suppressed over two rounds.',
        timing: 'Off cooldown on sight, then two rounds of wind-up. Never overlaps another charge.',
        answer:
          'Damage, and a lot of it, inside the window. Falling short still pays — progress toward the ' +
          'bar scales the hit down rather than being wasted.',
      },
      act_debt_final_demand: {
        role: 'Ultimate. The closer, and the move that actually kills people.',
        timing:
          'Fires on sight every three rounds, and hunts the lowest-HP hero. It is most dangerous ' +
          'immediately after First Notice lands, which is not a coincidence.',
        answer:
          'Two answers, and you need one of them. Keep everyone above the execute threshold, or ' +
          'interrupt it — it is the only ultimate that can be cancelled by raw damage.',
      },
    },
  },
};
