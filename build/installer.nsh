!macro clearPreviousUninstaller ROOT_KEY
  ReadRegStr $R2 ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ${if} $R2 != ""
    DetailPrint "Skipping previous ${PRODUCT_NAME} uninstaller during upgrade."
    DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}"
  ${endIf}

  !ifdef UNINSTALL_REGISTRY_KEY_2
    ReadRegStr $R2 ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY_2}" "UninstallString"
    ${if} $R2 != ""
      DetailPrint "Skipping previous ${PRODUCT_NAME} secondary uninstaller during upgrade."
      DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY_2}"
    ${endIf}
  !endif
!macroend

!macro customInit
  !insertmacro clearPreviousUninstaller HKCU
  !insertmacro clearPreviousUninstaller HKLM
!macroend

!macro customCheckAppRunning
  !define /redef MSHELL_CHECK_ID ${__LINE__}

  DetailPrint "Checking for running ${PRODUCT_NAME} processes..."

  StrCpy $R1 0

  retryClose_${MSHELL_CHECK_ID}:
  !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 != 0
    Goto appNotRunning_${MSHELL_CHECK_ID}
  ${endIf}

  ${if} $R1 == 0
    DetailPrint `Closing running "${PRODUCT_NAME}"...`
    nsExec::ExecToLog `%SYSTEMROOT%\System32\cmd.exe /c taskkill /t /im "${APP_EXECUTABLE_FILENAME}"`
    Sleep 800
  ${else}
    DetailPrint `Forcing remaining "${PRODUCT_NAME}" processes to close...`
    nsExec::ExecToLog `%SYSTEMROOT%\System32\cmd.exe /c taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}"`
    Sleep 1200
  ${endIf}

  IntOp $R1 $R1 + 1

  !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    ${if} $R1 < 2
      Goto retryClose_${MSHELL_CHECK_ID}
    ${endif}
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY retryClose_${MSHELL_CHECK_ID}
    Quit
  ${endIf}

  appNotRunning_${MSHELL_CHECK_ID}:
  !undef MSHELL_CHECK_ID
!macroend
