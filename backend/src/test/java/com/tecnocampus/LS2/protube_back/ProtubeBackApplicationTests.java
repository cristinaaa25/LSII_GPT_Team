package com.tecnocampus.LS2.protube_back;

import com.tecnocampus.LS2.protube_back.services.VideoService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest({
        "pro_tube.store.dir=c:",
        "pro_tube.load_initial_data=false"
})
@ActiveProfiles("test")
class ProtubeBackApplicationTests {

    @Autowired
    VideoService videoService;

    @Test
    void shouldStartApp() {
        Assertions.assertNotNull(videoService);
    }

}
