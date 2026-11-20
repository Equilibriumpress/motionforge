import {useEffect,useState} from 'react';
import {Player} from '@remotion/player';
import {loadProject} from '../lib/projects.js';
import PreviewPlayer from '../preview/PreviewPlayer.jsx';
import TitleSequence from './TitleSequence.jsx';
import RenderMp4 from './RenderMp4.jsx';
import {acceptsBrowserRender,browserComposition,renderProps} from './render-settings.js';

export default function ProjectMedia({project,coverUrl}) {
  const [state,setState]=useState({loading:true,manifest:null,error:null});
  useEffect(()=>{
    let active=true;
    loadProject(project.id).then(manifest=>{
      if(active)setState({loading:false,manifest,error:null});
    },reason=>{
      if(active)setState({loading:false,manifest:null,error:reason.message});
    });
    return()=>{active=false};
  },[project.id]);
  if(state.loading) return <div className="media-loading" role="status">Project laden…</div>;
  if(state.error) return <div className="media-loading" role="alert">{state.error}</div>;
  if (!acceptsBrowserRender(state.manifest)) return <PreviewPlayer project={project} coverUrl={coverUrl}/>;
  const composition=browserComposition(state.manifest,TitleSequence);
  return (
    <div className="project-media">
      <div className="remotion-player">
        <Player component={TitleSequence} inputProps={renderProps(state.manifest)}
          durationInFrames={composition.durationInFrames} compositionWidth={composition.width}
          compositionHeight={composition.height} fps={composition.fps}
          controls loop autoPlay={false} style={{width:'100%',aspectRatio:String(composition.width)+' / '+String(composition.height)}}/>
      </div>
      <RenderMp4 key={project.id} manifest={state.manifest}/>
    </div>
  );
}
