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
    // When authResult is available, it means the picker is trying to open.
    if (authResult) {
      setIsPickerOpen(true);
    }
  }, [authResult]);

  const handleOpenPicker = (params: OpenPickerParams) => {
    // The picker is designed to be called with all parameters at once.
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      developerKey: params.developerKey,
      viewId: params.viewId || "DOCS",
      token: (window as any).gapi?.auth?.getToken()?.access_token,
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: params.supportDrives || false,
      multiselect: false,
      // customViews: customViewsArray, // Optional: for custom views
      callbackFunction: (data) => {
        setIsPickerOpen(false); // Picker is closed after an action
        params.callbackFunction(data);
      },
    });
  };

  return { openPicker: handleOpenPicker, isPickerOpen };
}
