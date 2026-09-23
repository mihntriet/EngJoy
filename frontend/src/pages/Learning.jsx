import React, { useEffect, useState } from 'react';
import { splash } from '../constants/gameData';
import { useProgressStore } from '../context/progressStore';
import { useAuthStore } from '../context/authStore';
import RaidEncounter from '../components/learning/RaidEncounter';
import QuestRealmView from '../components/learning/QuestRealmView';

const ALIGNMENTS = ['is-left', 'is-center', 'is-right'];

function SagaMap({ quests, questUnits, selectedIndex, setActiveQuestIndex, onExplore }) {
  return <main className="saga-map" style={{ '--saga-art': `url(${splash(quests[selectedIndex]?.champion || 'Lux')})` }}><div className="saga-map-shade" /><header className="saga-map-header"><p>ENGJOY // OPEN-WORLD SAGA</p><h1>Con đường chinh phục</h1><span>{quests[selectedIndex]?.label} · {quests[selectedIndex]?.name}</span></header><section className="saga-path" aria-label="Bản đồ hành trình học tập">{quests.map((quest, index) => { const locked = quest.status === 'locked'; const active = selectedIndex === index && !locked; const completed = quest.status === 'complete'; return <article className={`saga-waypoint ${ALIGNMENTS[index % ALIGNMENTS.length]} ${locked ? 'is-locked' : ''} ${active ? 'is-active' : ''} ${completed ? 'is-complete' : ''}`} key={quest.id}><button className="saga-rune" type="button" disabled={locked} onClick={() => !locked && setActiveQuestIndex(index)} aria-label={locked ? `${quest.name} đang khóa` : `Mở ${quest.name}`}><span>{locked ? '🔒' : completed ? '✓' : index + 1}</span></button><div className="saga-waypoint-copy"><p>{locked ? 'SEALED TERRITORY' : completed ? 'CONQUERED' : active ? 'CURRENT REALM' : 'DISCOVERED REALM'}</p><h2>{quest.label} · {quest.name}</h2><span>{quest.done}/{quest.units} ải đã hoàn tất</span>{!locked && <button type="button" className="saga-raid-button" onClick={() => onExplore(quest, index)}>KHÁM PHÁ</button>}</div></article>; })}</section><aside className="saga-current-hud"><p>ACTIVE EXPEDITION</p><strong>{quests[selectedIndex]?.name}</strong><span>{(questUnits[quests[selectedIndex]?.id] || []).filter((unit) => unit.status === 'done').length}/{(questUnits[quests[selectedIndex]?.id] || []).length} memory seals recovered</span></aside></main>;
}

export default function Learning({ onImmersiveChange }) {
  const { quests, questUnits, activeQuestIndex, setActiveQuestIndex, completeUnitLesson, startLessonAttempt, submitLessonAttempt } = useProgressStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const selectedIndex = activeQuestIndex ?? 0;
  const [exploringQuest, setExploringQuest] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Also pass the exploring state so the layout can hide the sidebar if needed
  useEffect(() => {
    onImmersiveChange?.(Boolean(activeLesson) || Boolean(exploringQuest));
    return () => onImmersiveChange?.(false);
  }, [activeLesson, exploringQuest, onImmersiveChange]);

  const handleExplore = (quest, index) => {
    if (quest.status === 'locked') return;
    setActiveQuestIndex(index);
    setExploringQuest(quest);
  };

  const beginRaid = (unit) => {
    if (unit.status === 'locked') return;
    setActiveLesson({ ...unit, questId: exploringQuest.id });
  };

  const activeQuestUnits = activeLesson ? (questUnits[activeLesson.questId] || []) : [];
  const currentUnitIndex = activeQuestUnits.findIndex(u => u.id === activeLesson?.id);
  const hasNextUnit = currentUnitIndex !== -1 && currentUnitIndex < activeQuestUnits.length - 1;
  const isQuestComplete = currentUnitIndex !== -1 && currentUnitIndex === activeQuestUnits.length - 1;

  const handleComplete = async (payload, action) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await completeUnitLesson(payload.questId, payload.unitId, payload.attemptId, null, payload.score);
      
      if (action === 'next_unit') {
        // Use getState to ensure we get the fresh status if needed, or just use the next index
        const freshUnits = useProgressStore.getState().questUnits[payload.questId] || [];
        const nextUnit = freshUnits[currentUnitIndex + 1];
        if (nextUnit) {
          setActiveLesson({ ...nextUnit, questId: payload.questId });
        } else {
          setActiveLesson(null);
        }
      } else if (action === 'next_quest') {
        setActiveLesson(null);
        setExploringQuest(null);
      } else {
        // back
        setActiveLesson(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (activeLesson) return <RaidEncounter questId={activeLesson.questId} unit={activeLesson} isAuthenticated={isAuthenticated} hasNextUnit={hasNextUnit} isQuestComplete={isQuestComplete} onClose={() => setActiveLesson(null)} onComplete={handleComplete} onStartAttempt={startLessonAttempt} onSubmitAttempt={submitLessonAttempt} />;

  if (exploringQuest) {
    return (
      <QuestRealmView 
        quest={exploringQuest} 
        units={questUnits[exploringQuest.id] || []} 
        onBack={() => setExploringQuest(null)} 
        onStartUnit={beginRaid} 
      />
    );
  }

  return <SagaMap quests={quests} questUnits={questUnits} selectedIndex={selectedIndex} setActiveQuestIndex={setActiveQuestIndex} onExplore={handleExplore} />;
}
