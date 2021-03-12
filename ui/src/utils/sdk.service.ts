/**
 * Copyright (c) Microblink Ltd. All rights reserved.
 */

import * as BlinkIDSDK from "../../../es/blinkid-sdk";

import {
  AnonymizationMode,
  AvailableRecognizers,
  AvailableRecognizerOptions,
  CameraExperience,
  Code,
  EventFatalError,
  EventReady,
  VideoRecognitionConfiguration,
  ImageRecognitionConfiguration,
  RecognizerInstance,
  RecognitionEvent,
  RecognitionStatus,
  RecognitionResults,
  SdkSettings
} from './data-structures';

export interface CheckConclusion {
  status: boolean;
  message?: string;
}

export class SdkService {
  private sdk: BlinkIDSDK.WasmSDK;

  private eventEmitter$: HTMLAnchorElement;

  private cancelInitiatedFromOutside: boolean = false;

  private recognizerName: string;

  private videoRecognizer: BlinkIDSDK.VideoRecognizer;

  public showOverlay: boolean = false;

  constructor() {
    this.eventEmitter$ = document.createElement('a');
  }

  public initialize(licenseKey: string, sdkSettings: SdkSettings): Promise<EventReady|EventFatalError> {
    const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings(licenseKey);

    loadSettings.allowHelloMessage = sdkSettings.allowHelloMessage;
    loadSettings.engineLocation = sdkSettings.engineLocation;

    return new Promise((resolve) => {
      BlinkIDSDK.loadWasmModule(loadSettings)
        .then((sdk: BlinkIDSDK.WasmSDK) => {
          this.sdk = sdk;
          this.showOverlay = sdk.showOverlay;
          resolve(new EventReady(this.sdk));
        })
        .catch(error => {
          resolve(new EventFatalError(Code.SdkLoadFailed, 'Failed to load SDK!', error));
        });
    });
  }

  public checkRecognizers(recognizers: Array<string>): CheckConclusion {
    if (!recognizers || !recognizers.length) {
      return {
        status: false,
        message: 'There are no provided recognizers!'
      }
    }

    for (const recognizer of recognizers) {
      if (!this.isRecognizerAvailable(recognizer)) {
        return {
          status: false,
          message: `Recognizer "${ recognizer }" doesn't exist!`
        }
      }
      if (recognizer === 'BlinkIdCombinedRecognizer' && recognizers.length > 1) {
        return {
          status: false,
          message: 'Recognizer "BlinkIdCombinedRecognizer" cannot be used in combination with other recognizers!'
        };
      }
    }

    return {
      status: true
    }
  }

  public checkRecognizerOptions(recognizers: Array<string>, recognizerOptions: Array<string>): CheckConclusion {
    if (!recognizerOptions || !recognizerOptions.length) {
      return {
        status: true
      }
    }

    for (const recognizerOption of recognizerOptions) {
      let optionExistInProvidedRecognizers = false;

      for (const recognizer of recognizers) {
        const availableOptions = AvailableRecognizerOptions[recognizer];

        if (availableOptions.indexOf(recognizerOption) > -1) {
          optionExistInProvidedRecognizers = true;
          break;
        }
      }

      if (!optionExistInProvidedRecognizers) {
        return {
          status: false,
          message: `Recognizer option "${ recognizerOption }" is not supported by available recognizers!`
        }
      }
    }

    return {
      status: true
    }
  }

  public getDesiredCameraExperience(recognizers: Array<string>, _recognizerOptions: Array<string> = []): CameraExperience {
    if (recognizers.indexOf('BlinkIdCombinedRecognizer') > -1) {
      return CameraExperience.CardCombined;
    }

    if (recognizers.indexOf('BlinkIdRecognizer') > -1) {
      return CameraExperience.CardSingleSide;
    }

    return CameraExperience.Barcode;
  }

  public async scanFromCamera(
    configuration: VideoRecognitionConfiguration,
    eventCallback: (ev: RecognitionEvent) => void
  ): Promise<void> {
    eventCallback({ status: RecognitionStatus.Preparing });

    this.cancelInitiatedFromOutside = false;

    const recognizers = await this.createRecognizers(
      configuration.recognizers,
      configuration.recognizerOptions,
      configuration.anonymization,
      configuration.successFrame
    );

    const recognizerRunner = await this.createRecognizerRunner(
      recognizers,
      eventCallback
    );

    try {
      this.videoRecognizer = await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream(
        configuration.cameraFeed,
        recognizerRunner,
        configuration.cameraId
      );

      await this.videoRecognizer.setVideoRecognitionMode(BlinkIDSDK.VideoRecognitionMode.Recognition);

      this.eventEmitter$.addEventListener('terminate', async () => {
        if (this.videoRecognizer && typeof this.videoRecognizer.cancelRecognition === 'function') {
          this.videoRecognizer.cancelRecognition();
        }

        if (recognizerRunner) {
            try {
              await recognizerRunner.delete();
            } catch (error) {
              // Psst, this error should not happen.
            }
        }

        for (const recognizer of recognizers) {
          if (!recognizer) {
            continue;
          }

          if (
            recognizer.recognizer &&
            recognizer.recognizer.objectHandle > -1 &&
            typeof recognizer.recognizer.delete === 'function'
          ) {
            recognizer.recognizer.delete()
          }

          if (
            recognizer.successFrame &&
            recognizer.successFrame.objectHandle > -1
            && typeof recognizer.successFrame.delete === 'function'
          ) {
            recognizer.successFrame.delete();
          }
        }

        window.setTimeout(() => {
          if (this.videoRecognizer) {
            this.videoRecognizer.releaseVideoFeed();
          }
        }, 1);
      });

      this.videoRecognizer.startRecognition(
        async (recognitionState: BlinkIDSDK.RecognizerResultState) => {
          this.videoRecognizer.pauseRecognition();

          eventCallback({ status: RecognitionStatus.Processing });

          if (recognitionState !== BlinkIDSDK.RecognizerResultState.Empty) {
            for (const recognizer of recognizers) {
              const results = await recognizer.recognizer.getResult();
              this.recognizerName = recognizer.recognizer.recognizerName;

              if (!results || results.state === BlinkIDSDK.RecognizerResultState.Empty) {
                eventCallback({
                  status: RecognitionStatus.EmptyResultState,
                  data: {
                    initiatedByUser: this.cancelInitiatedFromOutside,
                    recognizerName: this.recognizerName
                  }
                });
              } else {
                const recognitionResults: RecognitionResults = {
                  recognizer: results,
                  recognizerName: this.recognizerName
                }

                if (recognizer.successFrame) {
                  const successFrameResults = await recognizer.successFrame.getResult();

                  if (successFrameResults && successFrameResults.state !== BlinkIDSDK.RecognizerResultState.Empty) {
                    recognitionResults.successFrame = successFrameResults;
                  }
                }

                eventCallback({
                  status: RecognitionStatus.ScanSuccessful,
                  data: {
                    result: recognitionResults,
                    initiatedByUser: this.cancelInitiatedFromOutside,
                    imageCapture: this.recognizerName === 'BlinkIdImageCaptureRecognizer'
                  }
                });
                break;
              }
            }
          } else {
            eventCallback({
              status: RecognitionStatus.EmptyResultState,
              data: {
                initiatedByUser: this.cancelInitiatedFromOutside,
                recognizerName: ''
              }
            });
          }

          if (this.recognizerName !== 'BlinkIdImageCaptureRecognizer') {
            window.setTimeout(() => void this.cancelRecognition(), 400);
          }
        });
    } catch (error) {
      if (error && error.name === 'VideoRecognizerError') {
        const reason = (error as BlinkIDSDK.VideoRecognizerError).reason;

        switch (reason) {
          case BlinkIDSDK.NotSupportedReason.MediaDevicesNotSupported:
            eventCallback({ status: RecognitionStatus.NoSupportForMediaDevices });
            break;

          case BlinkIDSDK.NotSupportedReason.CameraNotFound:
            eventCallback({ status: RecognitionStatus.CameraNotFound });
            break;

          case BlinkIDSDK.NotSupportedReason.CameraNotAllowed:
            eventCallback({ status: RecognitionStatus.CameraNotAllowed });
            break;

          case BlinkIDSDK.NotSupportedReason.CameraInUse:
            eventCallback({ status: RecognitionStatus.CameraInUse });
            break;

          default:
            eventCallback({ status: RecognitionStatus.UnableToAccessCamera });
        }

        console.warn('VideoRecognizerError', error.name, '[' + reason + ']:', error.message);
        void this.cancelRecognition();
      } else {
        eventCallback({ status: RecognitionStatus.UnknownError });
      }
    }
  }

  public async flipCamera(): Promise<void> {
    await this.videoRecognizer.flipCamera();
  }

  public isCameraFlipped(): boolean {
    if (!this.videoRecognizer) {
      return false;
    }
    return this.videoRecognizer.cameraFlipped;
  }

  public isScanFromImageAvailable(recognizers: Array<string>, _recognizerOptions: Array<string> = []): boolean {
    return recognizers.indexOf('BlinkIdCombinedRecognizer') === -1;
  }

  public async scanFromImage(
    configuration: ImageRecognitionConfiguration,
    eventCallback: (ev: RecognitionEvent) => void
  ): Promise<void> {
    eventCallback({ status: RecognitionStatus.Preparing });

    const recognizers = await this.createRecognizers(
      configuration.recognizers,
      configuration.recognizerOptions,
      configuration.anonymization
    );

    const recognizerRunner = await this.createRecognizerRunner(
      recognizers,
      eventCallback
    );

    // Get image file
    const imageRegex = RegExp(/^image\//);
    const file: File|null = (() => {
      for (let i = 0; i < configuration.fileList.length; ++i) {
        if (imageRegex.exec(configuration.fileList[i].type)) {
          return configuration.fileList[i];
        }
      }

      return null;
    })();

    if (!file) {
      eventCallback({ status: RecognitionStatus.NoImageFileFound });
      return;
    }

    const imageElement = new Image();
    imageElement.src = URL.createObjectURL(file);
    await imageElement.decode();

    const imageFrame = BlinkIDSDK.captureFrame(imageElement);

    this.eventEmitter$.addEventListener('terminate', async () => {
      if (recognizerRunner) {
          try {
            await recognizerRunner.delete();
          } catch (error) {
            // Psst, this error should not happen.
          }
      }

      for (const recognizer of recognizers) {
        if (!recognizer) {
          continue;
        }

        if (
          recognizer.recognizer &&
          recognizer.recognizer.objectHandle > -1 &&
          typeof recognizer.recognizer.delete === 'function'
        ) {
          await recognizer.recognizer.delete();
        }
      }

      this.eventEmitter$.dispatchEvent(new Event('terminate:done'));
    });

    // Get results
    eventCallback({ status: RecognitionStatus.Processing });

    const processResult = await recognizerRunner.processImage(imageFrame);

    if (processResult !== BlinkIDSDK.RecognizerResultState.Empty) {
      for (const recognizer of recognizers) {
        const results = await recognizer.recognizer.getResult();

        if (!results || results.state === BlinkIDSDK.RecognizerResultState.Empty) {
          eventCallback({
            status: RecognitionStatus.EmptyResultState,
            data: {
              initiatedByUser: this.cancelInitiatedFromOutside,
              recognizerName: recognizer.name
            }
          });
        } else {
          const recognitionResults: RecognitionResults = {
            recognizer: results,
            imageCapture: recognizer.name === 'BlinkIdImageCaptureRecognizer',
            recognizerName: recognizer.name
          };
          eventCallback({
            status: RecognitionStatus.ScanSuccessful,
            data: recognitionResults
          });
          break;
        }
      }
    } else {
      // If necessary, scan the image once again with different settings
      if (
        configuration.thoroughScan &&
        (
          configuration.recognizers.indexOf('BlinkIdRecognizer') > -1 ||
          configuration.recognizers.indexOf('BlinkIdCombinedRecognizer') > -1
        )
      ) {
        configuration.thoroughScan = false;

        if (
          !Array.isArray(configuration.recognizerOptions) ||
          configuration.recognizerOptions.indexOf('scanCroppedDocumentImage') === -1
        ) {
          if (!Array.isArray(configuration.recognizerOptions)) {
            configuration.recognizerOptions = [];
          }
          configuration.recognizerOptions.push('scanCroppedDocumentImage');
        }
        else {
          const position = configuration.recognizerOptions.indexOf('scanCroppedDocumentImage');
          configuration.recognizerOptions.splice(position, 1);
        }

        const eventHandler = (recognitionEvent: RecognitionEvent) => eventCallback(recognitionEvent);
        const handleTerminateDone = () => {
          this.eventEmitter$.removeEventListener('terminate:done', handleTerminateDone);
          this.scanFromImage(configuration, eventHandler);
        }
        this.cancelRecognition();
        this.eventEmitter$.addEventListener('terminate:done', handleTerminateDone);
        return;
      }
      eventCallback({
        status: RecognitionStatus.EmptyResultState,
        data: {
          initiatedByUser: this.cancelInitiatedFromOutside,
          recognizerName: ''
        }
      });
    }

    window.setTimeout(() => void this.cancelRecognition(), 500);
  }

  public async stopRecognition() {
    void await this.cancelRecognition(true);
  }

  public async resumeRecognition(): Promise<void> {
    this.videoRecognizer.resumeRecognition(true);
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // PRIVATE METHODS

  private isRecognizerAvailable(recognizer: string): boolean {
    return !!AvailableRecognizers[recognizer];
  }

  private async createRecognizers(
    recognizers: Array<string>,
    recognizerOptions?: Array<string>,
    anonymization?: AnonymizationMode,
    successFrame: boolean = false
  ): Promise<Array<RecognizerInstance>> {
    const pureRecognizers = [];

    for (const recognizer of recognizers) {
      const instance = await BlinkIDSDK[AvailableRecognizers[recognizer]](this.sdk);
      pureRecognizers.push(instance);
    }

    if (recognizerOptions && recognizerOptions.length) {
      for (const recognizer of pureRecognizers) {
        let settingsUpdated = false;
        const settings = await recognizer.currentSettings();

        for (const setting of recognizerOptions) {
          if (setting in settings) {
            settings[setting] = true;
            settingsUpdated = true;
          }
        }

        if (settingsUpdated) {
          await recognizer.updateSettings(settings);
        }
      }
    }

    if (typeof anonymization !== 'undefined') {
      for (const recognizer of pureRecognizers) {
        const settings = await recognizer.currentSettings();

        settings.anonymizationMode = anonymization;

        await recognizer.updateSettings(settings);
      }
    }

    const recognizerInstances = [];

    for (let i = 0; i < pureRecognizers.length; ++i) {
      const recognizer = pureRecognizers[i];
      const instance: RecognizerInstance = { name: recognizers[i], recognizer }

      if (successFrame) {
        const successFrameGrabber = await BlinkIDSDK.createSuccessFrameGrabberRecognizer(this.sdk, recognizer);
        instance.successFrame = successFrameGrabber;
      }

      recognizerInstances.push(instance)
    }

    return recognizerInstances;
  }

  private async createRecognizerRunner(
    recognizers: Array<RecognizerInstance>,
    eventCallback: (ev: RecognitionEvent) => void
  ): Promise<BlinkIDSDK.RecognizerRunner> {
    const metadataCallbacks: BlinkIDSDK.MetadataCallbacks = {
      onDetectionFailed: () => eventCallback({ status: RecognitionStatus.DetectionFailed }),
      onQuadDetection: (quad: BlinkIDSDK.Displayable) => {
        eventCallback({ status: RecognitionStatus.DetectionStatusChange, data: quad });

        const detectionStatus = quad.detectionStatus;
        switch (detectionStatus) {
          case BlinkIDSDK.DetectionStatus.Fail:
            eventCallback({ status: RecognitionStatus.DetectionStatusSuccess });
            break;

          case BlinkIDSDK.DetectionStatus.Success:
            eventCallback({ status: RecognitionStatus.DetectionStatusSuccess });
            break;

          case BlinkIDSDK.DetectionStatus.CameraTooHigh:
            eventCallback({ status: RecognitionStatus.DetectionStatusCameraTooHigh });
            break;

          case BlinkIDSDK.DetectionStatus.FallbackSuccess:
            eventCallback({ status: RecognitionStatus.DetectionStatusFallbackSuccess });
            break;

          case BlinkIDSDK.DetectionStatus.Partial:
            eventCallback({ status: RecognitionStatus.DetectionStatusPartial });
            break;

          case BlinkIDSDK.DetectionStatus.CameraAtAngle:
            eventCallback({ status: RecognitionStatus.DetectionStatusCameraAtAngle });
            break;

          case BlinkIDSDK.DetectionStatus.CameraTooNear:
            eventCallback({ status: RecognitionStatus.DetectionStatusCameraTooNear });
            break;

          case BlinkIDSDK.DetectionStatus.DocumentTooCloseToEdge:
            eventCallback({ status: RecognitionStatus.DetectionStatusDocumentTooCloseToEdge });
            break;

          default:
            // Send nothing
        }
      }
    }
    const blinkIdGeneric = recognizers.find(el => el.recognizer.recognizerName === 'BlinkIdRecognizer');
    const blinkIdCombined = recognizers.find(el => el.recognizer.recognizerName === 'BlinkIdCombinedRecognizer');

    if (blinkIdGeneric || blinkIdCombined) {
      for (const el of recognizers) {
        if (
          el.recognizer.recognizerName === 'BlinkIdRecognizer' ||
          el.recognizer.recognizerName === 'BlinkIdCombinedRecognizer'
        ) {
          const settings = await el.recognizer.currentSettings() as BlinkIDSDK.BlinkIdRecognizerSettings;
          settings.classifierCallback = (supported: boolean) => {
            eventCallback({ status: RecognitionStatus.DocumentClassified, data: supported });
          }
          await el.recognizer.updateSettings(settings);
        }
      }
    }

    if (blinkIdCombined) {
      metadataCallbacks.onFirstSideResult = () => eventCallback({ status: RecognitionStatus.OnFirstSideResult });
    }
    const recognizerRunner = await BlinkIDSDK.createRecognizerRunner(
      this.sdk,
      recognizers.map((el: RecognizerInstance) => el.successFrame || el.recognizer),
      false,
      metadataCallbacks
    );

    return recognizerRunner;
  }

  private async cancelRecognition(initiatedFromOutside: boolean = false): Promise<void> {
    this.cancelInitiatedFromOutside = initiatedFromOutside;
    this.eventEmitter$.dispatchEvent(new Event('terminate'));
  }
}

