/**
 * Invariant for a native MotionForge frame captured into a video.
 * A 9:16 scene embedded in a 16:9 stage is NOT full-frame video.
 * Distinguish a deliberately small designed motif from an actual nested video.
 */
export function validateStageFill(stage,{minCoverage=0.985,aspectTolerance=0.025}={}){
 const fail=reason=>({ok:false,reason,coverageX:0,coverageY:0});
 if(!stage||!['width','height','nativeWidth','nativeHeight','viewportWidth','viewportHeight',
 'left','top'].every(key=>Number.isFinite(stage[key])))
   return fail('Geen betrouwbare scènegeometrie ontvangen.');
 if([stage.width,stage.height,stage.nativeWidth,stage.nativeHeight,
 stage.viewportWidth,stage.viewportHeight].some(n=>n<=0))
   return fail('Scèneformaat of videokader is ongeldig.');
 const coverageX=stage.width/stage.viewportWidth;
 const coverageY=stage.height/stage.viewportHeight;
 const sourceAspect=stage.nativeWidth/stage.nativeHeight;
 const frameAspect=stage.viewportWidth/stage.viewportHeight;
 const relativeAspectError=Math.abs(sourceAspect/frameAspect-1);
 const coverage=Math.min(coverageX,coverageY);
 if(relativeAspectError>aspectTolerance)
   return {ok:false,reason:'Origineel scèneformaat '+stage.nativeWidth+'×'+stage.nativeHeight+
     ' verschilt van het videokader '+Math.round(stage.viewportWidth)+'×'+
     Math.round(stage.viewportHeight)+'. Maak een brongetrouwe formaatvariant, geen kleine ingesloten animatie.',
     coverageX,coverageY,relativeAspectError};
 if(coverage<minCoverage)
   return {ok:false,reason:'De scène vult het videokader onvoldoende ('+
     Math.round(coverage*100)+'%). Export gestopt om zwarte randen en kleine ingebedde video te voorkomen.',
     coverageX,coverageY,relativeAspectError};
 const dx=Math.abs(stage.left-(stage.viewportWidth-stage.width)/2);
 const dy=Math.abs(stage.top-(stage.viewportHeight-stage.height)/2);
 if(dx>Math.max(3,stage.viewportWidth*.015)||dy>Math.max(3,stage.viewportHeight*.015))
   return {ok:false,reason:'De scène staat niet gecentreerd in het uitvoerkader.',
     coverageX,coverageY,relativeAspectError};
 return {ok:true,reason:null,coverageX,coverageY,relativeAspectError};
}
export function expectedStage(nativeWidth,nativeHeight,viewportWidth,viewportHeight){
 const z=Math.min(viewportWidth/nativeWidth,viewportHeight/nativeHeight);
 return {nativeWidth,nativeHeight,viewportWidth,viewportHeight,
   width:nativeWidth*z,height:nativeHeight*z,
   left:(viewportWidth-nativeWidth*z)/2,top:(viewportHeight-nativeHeight*z)/2};
}
