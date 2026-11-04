package com.tecnocampus.LS2.protube_back;

import com.tecnocampus.LS2.protube_back.services.VideoStoreImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class AppStartupRunner implements ApplicationRunner {
    private static final Logger LOG =
            LoggerFactory.getLogger(AppStartupRunner.class);

    private final VideoStoreImporter videoStoreImporter;
    private final Path rootPath;
    private final boolean loadInitialData;

    public AppStartupRunner(Environment env, VideoStoreImporter videoStoreImporter) {
        this.videoStoreImporter = videoStoreImporter;
        final var rootDir = env.getProperty("pro_tube.store.dir");
        this.rootPath = Paths.get(rootDir);
        this.loadInitialData = env.getProperty("pro_tube.load_initial_data", Boolean.class, false);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!loadInitialData) {
            LOG.info("pro_tube.load_initial_data is false, skipping video store import");
            return;
        }
        videoStoreImporter.importAll(rootPath);
    }
}
