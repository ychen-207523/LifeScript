package com.lifescript.world;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Set;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PortraitValidator {

    public byte[] normalize(MultipartFile file) {
        if (file.getSize() > 5 * 1024 * 1024) throw invalid("Portraits must be 5 MB or smaller.");
        try (var input = ImageIO.createImageInputStream(file.getInputStream())) {
            if (input == null) throw invalid("Choose a PNG or JPEG image.");
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid("Choose a valid PNG or JPEG image.");
            var reader = readers.next();
            try {
                if (
                    !Set.of("png", "jpeg", "jpg").contains(
                        reader.getFormatName().toLowerCase(java.util.Locale.ROOT)
                    )
                ) {
                    throw invalid("Choose a PNG or JPEG image.");
                }
                reader.setInput(input, true, true);
                int width = reader.getWidth(0),
                    height = reader.getHeight(0);
                if (
                    width < 1 ||
                    height < 1 ||
                    width > 4096 ||
                    height > 4096 ||
                    (long) width * height > 8_000_000
                ) {
                    throw invalid(
                        "Portraits must be at most 4096 pixels per side and 8 megapixels."
                    );
                }
                var image = reader.read(0);
                var output = new ByteArrayOutputStream();
                ImageIO.write(image, "png", output); // Re-encode without uploaded metadata or filenames.
                return output.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw invalid("That image could not be read. Choose another PNG or JPEG.");
        }
    }

    private ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
