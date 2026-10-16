package com.tecnocampus.LS2.protube_back;

import com.tecnocampus.LS2.protube_back.services.VideoStoreImporter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.nio.file.Paths;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class AppStartupRunnerTest {

    private final VideoStoreImporter importer = mock(VideoStoreImporter.class);

    @Test
    void importsStoreWhenInitialDataIsEnabled() {
        var env = new MockEnvironment()
                .withProperty("pro_tube.store.dir", "store/")
                .withProperty("pro_tube.load_initial_data", "true");

        new AppStartupRunner(env, importer).run(null);

        verify(importer).importAll(Paths.get("store/"));
    }

    @Test
    void skipsImportWhenInitialDataIsDisabled() {
        var env = new MockEnvironment()
                .withProperty("pro_tube.store.dir", "store/")
                .withProperty("pro_tube.load_initial_data", "false");

        new AppStartupRunner(env, importer).run(null);

        verifyNoInteractions(importer);
    }

    @Test
    void skipsImportWhenFlagIsMissing() {
        var env = new MockEnvironment().withProperty("pro_tube.store.dir", "store/");

        new AppStartupRunner(env, importer).run(null);

        verifyNoInteractions(importer);
    }
}
