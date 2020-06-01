// Copyright (c) Microblink. All rights reserved.
!function(){"use strict";let e=0;class t{constructor(t){this.action=t,this.messageID=function(){const t=e;return e+=1,t}()}}class n extends t{constructor(e,t){super(n.action),this.wasmModuleName=e.wasmModuleName,this.licenseKey=e.licenseKey,this.userId=t,this.registerLoadCallback=null!=e.loadProgressCallback,this.allowHelloMessage=e.allowHelloMessage}}var s,o;n.action="init",function(e){e[e.Any=0]="Any",e[e.Recognizer=1]="Recognizer"}(s||(s={}));class a extends t{constructor(e,t){super(a.action),this.funcName=e,this.params=t}}a.action="invokeFunction";class i extends t{constructor(e,t){super(i.action),this.className=e,this.params=t}}i.action="createNewNativeObject";class c extends t{constructor(e,t,n){super(c.action),this.recognizerHandles=e,this.allowMultipleResults=t,this.registeredMetadataCallbacks=n}}c.action="createRecognizerRunner";class r extends t{constructor(e,t){super(r.action),this.recognizerHandles=e,this.allowMultipleResults=t}}r.action="reconfigureRecognizerRunner";class l extends t{constructor(){super(l.action)}}l.action="deleteRecognizerRunner";class u extends t{constructor(e,t,n){super(u.action),this.objectHandle=e,this.methodName=t,this.params=n}}u.action="invokeObject";class d extends t{constructor(e){super(d.action),this.frame=e}getTransferrables(){return[this.frame.imageData.data.buffer]}}d.action="processImage";class g extends t{constructor(e){super(g.action),this.hardReset=e}}g.action="resetRecognizers";class h extends t{constructor(e){super(h.action),this.registeredMetadataCallbacks=e}}h.action="registerMetadataCallbacks";class f extends t{constructor(e){super(f.action),this.detectionOnlyMode=e}}f.action="setDetectionOnly";class p extends t{constructor(e){super(p.action),this.callbackNonEmpty=e}}p.action="setClearTimeoutCallback";class m extends t{constructor(e){super(m.action),this.cameraPreviewMirrored=e}}m.action="setCameraPreviewMirrored";class b{constructor(e,t,n){this.success=!0,this.error=null,this.messageID=e,this.success=t,this.error=n}}class M extends b{constructor(e,t){super(e,!0,null),this.result=t}}class w extends b{constructor(e,t){super(e,!0,null),this.objectHandle=t}}class k extends b{constructor(e,t){super(e,!0,null),this.recognitionState=t}}class D{constructor(e){this.isLoadProgressMessage=!0,this.progress=e}}!function(e){e[e.onDebugText=0]="onDebugText",e[e.onDetectionFailed=1]="onDetectionFailed",e[e.onQuadDetection=2]="onQuadDetection",e[e.onPointsDetection=3]="onPointsDetection",e[e.onFirstSideResult=4]="onFirstSideResult",e[e.clearTimeoutCallback=5]="clearTimeoutCallback",e[e.onGlare=6]="onGlare"}(o||(o={}));class R{constructor(e,t){this.isCallbackMessage=!0,this.callbackType=e,this.callbackParameters=t}}const y=self;let z,C=null,x=null,N={},S=0,F={};function I(e,t){y.postMessage(new b(e.messageID,!1,t))}function T(e){y.postMessage(new b(e.messageID,!0,null))}function P(e){const t=[];for(let n in e.params){const o=e.params[n];let a=o.parameter;o.type===s.Recognizer&&(a=N[a],void 0===a&&I(e,"Cannot find object with handle: "+a)),t.push(a)}return t}function j(e){const t=[];for(let n in e){const s=e[n],o=N[s];t.push(o)}return t}function v(e){e.onDebugText?F.onDebugText=e=>{const t=new R(o.onDebugText,[e]);y.postMessage(t)}:delete F.onDebugText,e.onDetectionFailed?F.onDetectionFailed=()=>{const e=new R(o.onDetectionFailed,[]);y.postMessage(e)}:delete F.onDetectionFailed,e.onPointsDetection?F.onPointsDetection=e=>{const t=new R(o.onPointsDetection,[e]);y.postMessage(t)}:delete F.onPointsDetection,e.onQuadDetection?F.onQuadDetection=e=>{const t=new R(o.onQuadDetection,[e]);y.postMessage(t)}:delete F.onQuadDetection,e.onFirstSideResult?F.onFirstSideResult=()=>{const e=new R(o.onFirstSideResult,[]);y.postMessage(e)}:delete F.onFirstSideResult,e.onGlare?F.onGlare=e=>{const t=new R(o.onGlare,[e]);y.postMessage(t)}:delete F.onGlare}y.onmessage=e=>{const t=e.data;switch(t.action){case n.action:!function(e){let t=void 0;e.registerLoadCallback&&(t={setStatus:e=>{y.postMessage(new D(function(e){if("Running..."==e)return 100;if(0==e.length)return 0;const t=e.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);if(t){return 100*parseInt(t[2])/parseInt(t[4])}return console.debug("Cannot parse emscripten status: ",e),NaN}(e)))}});try{const n="./"+e.wasmModuleName+".js";importScripts(n),(0,self[e.wasmModuleName])(t).then(t=>{try{t.initializeWithLicenseKey(e.licenseKey,e.userId,e.allowHelloMessage),C=t,T(e)}catch(t){I(e,t)}},t=>{console.log("Failed to load WASM in web worker due to error: "+t),I(e,t)})}catch(t){console.log("Failed to load WASM in web worker due to error: "+t),I(e,t)}}(t);break;case a.action:!function(e){if(null==C)I(e,"WASM module is not initialized!");else{const t=e.funcName,n=P(e);try{const s=C[t](...n);y.postMessage(new M(e.messageID,s))}catch(t){I(e,t)}}}(t);break;case i.action:!function(e){if(null==C)I(e,"WASM module is not initialized!");else{const t=e.className,n=P(e);try{const s=new C[t](...n),o=function(){const e=S;return S+=1,e}();N[o]=s,y.postMessage(new w(e.messageID,o))}catch(t){I(e,t)}}}(t);break;case u.action:!function(e){try{const t=e.objectHandle,n=e.methodName,s=P(e),o=N[t];if(void 0===o)I(e,"Cannot find object with handle: "+t);else{const a=o[n](...s),i=function e(t){if("object"==typeof t){const n=Object.keys(t),s=[];for(let o in n){const a=n[o],i=t[a];i instanceof ImageData?s.push(i.data.buffer):i instanceof Uint8Array?s.push(i.buffer):null!=i&&"object"==typeof i&&s.push(...e(i))}return s}return[]}(a);"delete"==n&&delete N[t],y.postMessage(new M(e.messageID,a),i)}}catch(t){I(e,t)}}(t);break;case c.action:!function(e){if(null==C)I(e,"WASM module is not initialized!");else if(null!=x)I(e,"Recognizer runner is already created! Multiple instances are not allowed!");else{v(e.registeredMetadataCallbacks);try{const t=j(e.recognizerHandles);x=new C.RecognizerRunner(t,e.allowMultipleResults,F),T(e)}catch(t){I(e,t)}}}(t);break;case r.action:!function(e){if(null==C)I(e,"WASM module is not initialized!");else if(null==x)I(e,"Recognizer runner is not created! There is nothing to reconfigure!");else try{const t=j(e.recognizerHandles);x.reconfigureRecognizers(t,e.allowMultipleResults),T(e)}catch(t){I(e,t)}}(t);break;case l.action:!function(e){if(null==x)I(e,"Recognizer runner is already deleted!");else try{x.delete(),x=null,T(e)}catch(t){I(e,t)}}(t);break;case d.action:!function(e){if(null==x)I(e,"Recognizer runner is not initialized! Cannot process image!");else try{const t=e.frame,n=x.processImage(t);y.postMessage(new k(e.messageID,n))}catch(t){I(e,t)}}(t);break;case g.action:!function(e){if(null==x)I(e,"Recognizer runner is not initialized! Cannot process image!");else try{x.resetRecognizers(e.hardReset),T(e)}catch(t){I(e,t)}}(t);break;case f.action:!function(e){if(null==x)I(e,"Recognizer runner is not initialized! Cannot process image!");else try{x.setDetectionOnlyMode(e.detectionOnlyMode),T(e)}catch(t){I(e,t)}}(t);break;case m.action:!function(e){if(null==x)I(e,"Recognizer runner is not initialized! Cannot process image!");else try{x.setCameraPreviewMirrored(e.cameraPreviewMirrored),T(e)}catch(t){I(e,t)}}(t);break;case h.action:!function(e){if(null==x)I(e,"Recognizer runner is not initialized! Cannot process image!");else{v(e.registeredMetadataCallbacks);try{x.setJSDelegate(F),T(e)}catch(t){I(e,t)}}}(t);break;case p.action:!function(e){if(null==x)I(e,"Recognizer runner is not initialized! Cannot process image!");else{z=e.callbackNonEmpty?{onClearTimeout:()=>{const e=new R(o.clearTimeoutCallback,[]);y.postMessage(e)}}:null;try{x.setClearTimeoutCallback(z),T(e)}catch(t){I(e,t)}}}(t);break;default:throw console.error("Unknown message action: "+t.action),new Error("Unknown message action: "+t.action)}}}();
//# sourceMappingURL=MicroblinkSDK.worker.js.map