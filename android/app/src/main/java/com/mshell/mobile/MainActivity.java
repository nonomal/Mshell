package com.mshell.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidSshBridge.class);
        registerPlugin(SecurityBridge.class);
        super.onCreate(savedInstanceState);
    }
}
