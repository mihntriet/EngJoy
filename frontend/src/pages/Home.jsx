import DictionaryWidget from '@/components/dashboard/DictionaryWidget';
import LearningPathWidget from '@/components/dashboard/LearningPathWidget';
import GamingArenaWidget from '@/components/dashboard/GamingArenaWidget';
import QuizGameWidget from '@/components/dashboard/QuizGameWidget';
import StatsWidget from '@/components/dashboard/StatsWidget';

export default function Home() {
  return (
    <div className="flex flex-col gap-6 max-w-[1600px]">
      {/* Top Row: Dictionary (left ~55%) | Learning Path (right ~45%) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6 items-start">
        <DictionaryWidget />
        <LearningPathWidget />
      </div>

      {/* Bottom Row: Arena (left) | Quiz (center) | Stats (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[0.85fr_1.1fr_0.85fr] gap-6 items-start">
        <GamingArenaWidget />
        <QuizGameWidget />
        <StatsWidget />
      </div>
    </div>
  );
}
