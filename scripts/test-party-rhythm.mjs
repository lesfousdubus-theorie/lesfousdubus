import assert from "node:assert/strict";
import { build } from "esbuild";
const result=await build({stdin:{contents:`export * from './src/lib/party-rhythm';export * from './src/lib/passenger-motion';`,resolveDir:process.cwd()},bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
const rhythm=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
const clock=rhythm.createPartyClock();
const playback={track:"party",state:"playing",elapsed:10};
rhythm.syncPartyClock(clock,playback,1000);
assert.equal(rhythm.readPartyClock(clock,1250),10.25,"Frames interpolate the player's real time between snapshots.");
rhythm.syncPartyClock(clock,{...playback,state:"suspended",elapsed:10.25},1500);
assert.equal(rhythm.readPartyClock(clock,9000),10.25,"Buffering or another video must freeze the music clock.");
rhythm.syncPartyClock(clock,{...playback,elapsed:42},2000);
assert.equal(rhythm.readPartyClock(clock,2000),42,"Seeking changes the song phase immediately.");
assert.equal(rhythm.readPartyClock(clock,10000),42.5,"A missing iframe update cannot extrapolate forever.");
rhythm.syncPartyClock(clock,{...playback,track:"background"},3000);assert.equal(clock.valid,false);
const ids=["luffy","zoro","nami","usopp","sanji","chopper","robin","franky","brook","jinbe","law","ace","sabo","yamato","shanks","buggy","doflamingo","boa_hancock","vivi","mihawk"];
const a=rhythm.createPassengerPose(),b=rhythm.createPassengerPose();
for(let beat=0;beat<48;beat++){
  rhythm.syncPartyClock(rhythm.partyMusicClock,{...playback,elapsed:rhythm.PARTY_FIRST_BEAT+beat*rhythm.PARTY_BEAT_SECONDS},1000);
  rhythm.updatePartyDanceFrame(1000);
  for(const id of ids){
    rhythm.samplePassengerPose(a,123,0,0,.33,Infinity,true,false,id);
    rhythm.samplePassengerPose(b,9999,0,0,.33,Infinity,true,false,id);
    assert.deepEqual(a,b,"The age of the 3D scene never changes the musical phase.");
    assert(Math.abs(a.bob-.036)<1e-9,`${id} accents every music beat instead of an arbitrary personal tempo.`);
  }
}
rhythm.clearPartyDanceClock();
assert.equal(rhythm.getPartyDanceTime(7),7,"Isolated model fixtures retain a deterministic local clock.");
console.log("Party rhythm passed: twenty synchronized accents, player interpolation, pause/buffering, seek, stale samples and independent scene clocks.");
