import LevelingGuide from './LevelingGuide';
import Blessings from './Blessings';
import Dungeons from './Dungeons';
import SupporterPacks from './SupporterPacks';
import Poe2Rewards from './Poe2Rewards';
import { AldorScryer, Cenarion } from './WowCalculators';
import TalentTree from './TalentTree';

// Interactive sections. A content file picks one with `widget: '<name>'` and passes `props`.
const widgets = {
  leveling: LevelingGuide,
  blessings: Blessings,
  dungeons: Dungeons,
  supporterPacks: SupporterPacks,
  poe2Rewards: Poe2Rewards,
  aldorScryer: AldorScryer,
  cenarion: Cenarion,
  talentTree: TalentTree,
};

export default widgets;
