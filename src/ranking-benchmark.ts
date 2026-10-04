/** Offline discrimination check. Raw support scores are not OCR correctness probabilities. */
export type RankedCandidate={id:string;correct:boolean;score:number|null};
export function evaluateCandidateRanking(candidates:RankedCandidate[]){
 if(new Set(candidates.map(c=>c.id)).size!==candidates.length)throw Error('Duplicate candidate ids.');
 if(candidates.some(c=>c.score!==null&&(!Number.isFinite(c.score)||c.score<0||c.score>1)))throw Error('Invalid score.');
 const scored=candidates.filter((c):c is RankedCandidate&{score:number}=>c.score!==null);
 const good=scored.filter(c=>c.correct),bad=scored.filter(c=>!c.correct);let wins=0,ties=0,losses=0;
 for(const g of good)for(const b of bad){if(g.score>b.score)wins++;else if(g.score===b.score)ties++;else losses++;}
 const max=scored.length?Math.max(...scored.map(c=>c.score)):null,leaders=scored.filter(c=>c.score===max);
 return{total:candidates.length,scored:scored.length,unscored:candidates.length-scored.length,pairs:wins+ties+losses,wins,ties,losses,pairwiseAccuracy:wins+ties+losses?(wins+.5*ties)/(wins+ties+losses):null,top:leaders.map(c=>c.id),topStatus:!leaders.length?'unrun':leaders.length>1?'tie':leaders[0].correct?'correct':'wrong'};
}
