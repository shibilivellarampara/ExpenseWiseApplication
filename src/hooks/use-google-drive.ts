
'use client';
import { useEffect, useState } from 'react';
import useDrivePicker, { PickerResponse } from 'react-google-drive-picker';

type OpenPickerParams = {
  developerKey: string;
  viewId?: "DOCS" | "DOCS_IMAGES" | "DOCS_IMAGES_AND_VIDEOS" | "DOCS_VIDEOS" | "DOCS_FILES" | "DOCS_FOLDERS" | "FOLDERS";
  supportDrives?: boolean;
  callbackFunction: (data: PickerResponse) => void;
};

export function useGoogleDrive() {
  const [openPicker, authResult] = useDrivePicker();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (authResult) {
      setIsPickerOpen(true);
    }
  }, [authResult]);

  const handleOpenPicker = (params: OpenPickerParams) => {
    const accessToken = (window as any).gapi?.auth?.getToken()?.access_token;
    if (!accessToken) {
        console.error("Google API not initialized or user not signed in.");
        return;
    }
    
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      developerKey: params.developerKey,
      viewId: params.viewId || "DOCS",
      token: accessToken,
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: params.supportDrives || false,
      multiselect: false,
      callbackFunction: (data) => {
        setIsPickerOpen(false);
        params.callbackFunction(data);
      },
    });
  };

  return { openPicker: handleOpenPicker, isPickerOpen };
}
