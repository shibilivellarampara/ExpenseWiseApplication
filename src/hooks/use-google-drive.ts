
'use client';
import { useEffect, useState, useCallback } from 'react';
import useDrivePicker from 'react-google-drive-picker';
import type { PickerResponse } from 'react-google-drive-picker';

type OpenPickerParams = {
  developerKey: string;
  viewId?: google.picker.ViewId;
  supportDrives?: boolean;
  callbackFunction: (data: any) => void;
};

export function useGoogleDrive() {
  const [openPicker, authResult] = useDrivePicker();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (authResult) {
      setIsPickerOpen(true);
    }
  }, [authResult]);

  const handleOpenPicker = useCallback((params: OpenPickerParams) => {
    // Check if gapi is loaded
    if (!(window as any).gapi) {
        console.error("Google API script not loaded.");
        return;
    }

    const gapi = (window as any).gapi;

    const handleAuthResult = (authResult: google.accounts.oauth2.TokenResponse) => {
        if (authResult && !authResult.error) {
            openPicker({
                clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                developerKey: params.developerKey,
                viewId: params.viewId || "DOCS_FOLDERS",
                token: authResult.access_token,
                showUploadView: true,
                showUploadFolders: true,
                supportDrives: params.supportDrives || false,
                multiselect: false,
                callbackFunction: (data) => {
                    setIsPickerOpen(false);
                    params.callbackFunction(data);
                },
            });
        } else {
             console.error("Google Authentication error:", authResult?.error);
        }
    }
    
    // Initialize the Google Auth client
    gapi.load('client:auth2', () => {
       gapi.client.init({
            apiKey: params.developerKey,
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            scope: "https://www.googleapis.com/auth/drive.file",
        }).then(() => {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
                scope: "https://www.googleapis.com/auth/drive.file",
                callback: handleAuthResult,
            });

            const token = gapi.auth2.getAuthInstance().currentUser.get()?.getAuthResponse();
            if (token && token.expires_in > 0) {
                // If token exists and is not expired, use it directly
                handleAuthResult(token);
            } else {
                // Otherwise, request a new token
                tokenClient.requestAccessToken({ prompt: 'consent' });
            }
        }).catch((error: any) => {
            console.error("Error initializing GAPI client", error);
        });
    });

  }, [openPicker]);

  return { openPicker: handleOpenPicker, isPickerOpen };
}
