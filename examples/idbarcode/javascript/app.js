/**
 * BlinkID In-browser SDK demo app which demonstrates how to:
 *
 * - Change default SDK settings
 * - Scan the barcode from the identity document with web camera
 */

// General UI helpers
const initialMessageEl = document.getElementById( "msg" );
const progressEl = document.getElementById( "load-progress" );

// UI elements for scanning feedback
const cameraFeed = document.getElementById( "camera-feed" );
const scanFeedback = document.getElementById( "camera-guides" );

/**
 * Check browser support, customize settings and load WASM SDK.
 */
function main()
{
    // Check if browser has proper support for WebAssembly
    if ( !BlinkIDSDK.isBrowserSupported() )
    {
        initialMessageEl.innerText = "This browser is not supported!";
        return;
    }

    // 1. It's possible to obtain a free trial license key on microblink.com
    let licenseKey = "sRwAAAYJbG9jYWxob3N0r/lOPig/w35CpJnWKmMezUjG2iJrUNT3apaewMTaVKaMGOw0jBgCJnqPawuszZTY9KnqfdA+M3uPXbMpFZkj2FmSVqjtqrRhxjsul6HzP6Pzu/hDDpraYh8n29ASxzs5rZOEaoOIh1sLg8Lla40FA/PQEJOGX/hZXbqHO/EbdEEbH0D0/h6SpBs2O6Gb8XRQtqi/gu5C8LkUeMTgcKOciHcFnG2S591BSFkpWR+sexoKFwpKxhl1WfuWdfcl/C54mq1D1vZXAAg=";

    if ( window.location.hostname === "blinkid.github.io" )
    {
        licenseKey = "sRwAAAYRYmxpbmtpZC5naXRodWIuaW+qBF9hW4YlTvZbRuaFbqJLokhSr8TQq3rdHCxMKbenVPSAqXgiLOPjCorvn3zHCetBFnpcM7K5x1pyRKcSGOQq3KQr+Tukqn7iaVB1n5JcDvv+uCcf3TomfzEvtFYnNoyhxfwmXGAScc66eNLGU2CowiCmiymgjz7FJPZcPwvDy9u+MIW9fDZKaAQGFHvFUvGk59VODGmaIYfX8Z3ZHer8lnVxVOJUShEv+izBNXAXJLm/Mxfa6Y3Uscf7ZRMiGP5/LNLxXjc3Ig==";
    }

    // 2. Create instance of SDK load settings with your license key
    const loadSettings = new BlinkIDSDK.WasmSDKLoadSettings( licenseKey );

    // [OPTIONAL] Change default settings

    // Show or hide hello message in browser console when WASM is successfully loaded
    loadSettings.allowHelloMessage = true;

    // In order to provide better UX, display progress bar while loading the SDK
    loadSettings.loadProgressCallback = ( progress ) => progressEl.value = progress;

    // Set absolute location of the engine, i.e. WASM and support JS files
    loadSettings.engineLocation = "https://unpkg.com/@microblink/blinkid-in-browser-sdk@5.8.1/resources/";

    // 3. Load SDK
    BlinkIDSDK.loadWasmModule( loadSettings ).then
    (
        ( sdk ) =>
        {
            document.getElementById( "screen-initial" )?.classList.add( "hidden" );
            document.getElementById( "screen-start" )?.classList.remove( "hidden" );
            document.getElementById( "start-scan" )?.addEventListener( "click", ( ev ) =>
            {
                ev.preventDefault();
                startScan( sdk );
            });
        },
        ( error ) =>
        {
            initialMessageEl.innerText = "Failed to load SDK!";
            console.error( "Failed to load SDK!", error );
        }
    );
}

/**
 * Scan single side of identity document with web camera.
 */
async function startScan( sdk )
{
    document.getElementById( "screen-start" )?.classList.add( "hidden" );
    document.getElementById( "screen-scanning" )?.classList.remove( "hidden" );

    // 1. Create a recognizer objects which will be used to recognize single image or stream of images.
    //
    // ID Barcode Recognizer - scan barcodes from various ID documents
    const idBarcodeRecognizer = await BlinkIDSDK.createIdBarcodeRecognizer( sdk );

    // [OPTIONAL] Create a callbacks object that will receive recognition events, such as detected object location etc.
    const callbacks = {
        onDetectionFailed: () => scanFeedback.innerText = "Detection failed"
    }

    // 2. Create a RecognizerRunner object which orchestrates the recognition with one or more
    //    recognizer objects.
    const recognizerRunner = await BlinkIDSDK.createRecognizerRunner
    (
        // SDK instance to use
        sdk,
        // List of recognizer objects that will be associated with created RecognizerRunner object
        [ idBarcodeRecognizer ],
        // [OPTIONAL] Should recognition pipeline stop as soon as first recognizer in chain finished recognition
        false,
        // [OPTIONAL] Callbacks object that will receive recognition events
        callbacks
    );

    // 3. Create a VideoRecognizer object and attach it to HTMLVideoElement that will be used for displaying the camera feed
    const videoRecognizer = await BlinkIDSDK.VideoRecognizer.createVideoRecognizerFromCameraStream
    (
        cameraFeed,
        recognizerRunner
    );

    // 4. Start the recognition and await for the results
    const processResult = await videoRecognizer.recognize();

    // 5. If recognition was successful, obtain the result and display it
    if ( processResult !== BlinkIDSDK.RecognizerResultState.Empty )
    {
        const idBarcodeResult = await idBarcodeRecognizer.getResult();
        if ( idBarcodeResult.state !== BlinkIDSDK.RecognizerResultState.Empty )
        {
            console.log( "IDBarcode results", idBarcodeResult );

            const firstName = idBarcodeResult.firstName;
            const lastName = idBarcodeResult.lastName;
            const dateOfBirth = {
                year: idBarcodeResult.dateOfBirth.year,
                month: idBarcodeResult.dateOfBirth.month,
                day: idBarcodeResult.dateOfBirth.day
            }

            alert
            (
                `Hello, ${ firstName } ${ lastName }!\nYou were born on ${ dateOfBirth.year }-${ dateOfBirth.month }-${ dateOfBirth.day }.`
            );
        }
    }
    else
    {
        alert( "Could not extract information!" );
    }

    // 7. Release all resources allocated on the WebAssembly heap and associated with camera stream

    // Release browser resources associated with the camera stream
    videoRecognizer?.releaseVideoFeed();

    // Release memory on WebAssembly heap used by the RecognizerRunner
    recognizerRunner?.delete();

    // Release memory on WebAssembly heap used by the recognizer
    idBarcodeRecognizer?.delete();

    // Hide scanning screen and show scan button again
    document.getElementById( "screen-start" )?.classList.remove( "hidden" );
    document.getElementById( "screen-scanning" )?.classList.add( "hidden" );
}

// Run
main();
