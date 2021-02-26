/**
 * Copyright (c) Microblink Ltd. All rights reserved.
 */

// Import typings for UI component
import "@microblink/blinkid-in-browser-sdk/ui";

// Import typings for custom events
import
{
    EventFatalError,
    EventScanError,
    EventScanSuccess
} from "@microblink/blinkid-in-browser-sdk/ui/dist/types/utils/data-structures";

function initializeUiComponent()
{
    const blinkId = document.querySelector( "blinkid-in-browser" ) as HTMLBlinkidInBrowserElement;

    if ( !blinkId )
    {
        throw "Could not find UI component!";
    }

    blinkId.licenseKey = "sRwAAAYJbG9jYWxob3N0r/lOPk4/w35CpJlWLK04YLwpEFfLy74eEzBsqIdlzcmogHy1dxF2HwJyAVELy6cES3x4ULiDRUAuMtiA0RTV8XLfiIKmqjo3ufEZpgZ3yaCU4yryL5MmCvS2iMaPLwXo9emB6xXG/tAgij6vtDjgSAaI8Yp2oWyTrw+F5lBC56eFvXjyzT1RqpBhjYRFDeYyt2HO26ij2KgOXTEQA2GVT2+Jonq3xm6QpLmWosev6z9IaWUm/inh+LuQSU9Cindvxk+fHDk8wZ0035OPpqFSuaKNsHo2A8BtHAkVUPSh5WZcga+GNKWGPPlnnWDK7ku3O8xHF+9S";
    blinkId.engineLocation = window.location.origin;
    blinkId.recognizers = [ "BlinkIdRecognizer" ];

    blinkId.addEventListener( "fatalError", ( ev: CustomEventInit< EventFatalError > ) =>
    {
        const fatalError = ev.detail;
        console.log( "Could not load UI component", fatalError );
    });

    blinkId.addEventListener( "scanError", ( ev: CustomEventInit< EventScanError > ) =>
    {
        const scanError = ev.detail;
        console.log( "Could not scan a document", scanError );
    });

    blinkId.addEventListener( "scanSuccess", ( ev: CustomEventInit< EventScanSuccess > ) =>
    {
        const scanResults = ev.detail;
        console.log( "Scan results", scanResults );
    });
}

window.addEventListener( "DOMContentLoaded", () => initializeUiComponent() );