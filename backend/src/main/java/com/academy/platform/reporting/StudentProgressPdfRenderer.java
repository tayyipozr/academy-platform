package com.academy.platform.reporting;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class StudentProgressPdfRenderer {

    private static final float PAGE_MARGIN = 48;
    private static final float LINE_HEIGHT = 15;
    private static final float BODY_SIZE = 10;
    private static final float TITLE_SIZE = 19;
    private static final float HEADING_SIZE = 13;

    private static final DateTimeFormatter DATE_FORMAT
            = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    public byte[] render(
            StudentProgressReportResponse report
    ) {
        try (
                PDDocument document = new PDDocument(); ByteArrayOutputStream output
                = new ByteArrayOutputStream()) {
            PDType0Font regular = loadFont(
                    document,
                    "fonts/NotoSans-Regular.ttf"
            );

            PDType0Font bold = loadFont(
                    document,
                    "fonts/NotoSans-Bold.ttf"
            );

            try (
                    PdfCanvas canvas
                    = new PdfCanvas(
                            document,
                            regular,
                            bold
                    )) {
                canvas.title("Öğrenci Gelişim Raporu");

                canvas.labelValue(
                        "Öğrenci",
                        report.firstName()
                        + " "
                        + report.lastName()
                );

                canvas.labelValue(
                        "Öğrenci numarası",
                        report.studentNumber()
                );

                canvas.labelValue(
                        "Grup",
                        nullSafe(report.groupName())
                );

                canvas.labelValue(
                        "Rapor dönemi",
                        formatDate(report.dateFrom())
                        + " - "
                        + formatDate(report.dateTo())
                );

                canvas.separator();

                canvas.heading("Devam Durumu");

                canvas.metric(
                        "Devam yüzdesi",
                        percentage(
                                report.attendance()
                                        .attendancePercentage()
                        )
                );

                canvas.metric(
                        "Toplam yoklama",
                        report.attendance()
                                .totalFinalizedSessions()
                );

                canvas.metric(
                        "Katıldı",
                        report.attendance()
                                .presentCount()
                );

                canvas.metric(
                        "Geç kaldı",
                        report.attendance()
                                .lateCount()
                );

                canvas.metric(
                        "Katılmadı",
                        report.attendance()
                                .absentCount()
                );

                canvas.metric(
                        "Mazeretli",
                        report.attendance()
                                .excusedCount()
                );

                canvas.separator();

                canvas.heading("Performans");

                canvas.metric(
                        "Ortalama puan",
                        percentage(
                                report.development()
                                        .averageNormalizedScore()
                        )
                );

                canvas.metric(
                        "Son puan",
                        percentage(
                                report.development()
                                        .latestNormalizedScore()
                        )
                );

                canvas.metric(
                        "Puan değişimi",
                        decimal(
                                report.development()
                                        .scoreTrend()
                        )
                );

                canvas.metric(
                        "Başarı oranı",
                        percentage(
                                report.development()
                                        .passingRate()
                        )
                );

                canvas.metric(
                        "Gelişim durumu",
                        report.development()
                                .developmentStatus()
                                .name()
                                .replace('_', ' ')
                );

                canvas.separator();

                canvas.heading(
                        "Tamamlanan Dersler"
                );

                canvas.metric(
                        "Tamamlanan ders",
                        report.lessons()
                                .completedSessionCount()
                );

                canvas.metric(
                        "Katıldığı tamamlanan ders",
                        report.lessons()
                                .attendedCompletedSessionCount()
                );

                canvas.metric(
                        "Kaçırdığı tamamlanan ders",
                        report.lessons()
                                .missedCompletedSessionCount()
                );

                canvas.metric(
                        "Yoklaması olmayan ders",
                        report.lessons()
                                .sessionsWithoutAttendanceCount()
                );

                canvas.separator();

                canvas.heading("Müfredat İlerlemesi");

                canvas.metric(
                        "Tamamlanma yüzdesi",
                        percentage(
                                report.development()
                                        .groupCurriculumCompletionPercentage()
                        )
                );

                if (!report.development()
                        .criterionAverages()
                        .isEmpty()) {
                    canvas.separator();
                    canvas.heading(
                            "Kriter Ortalamaları"
                    );

                    for (var criterion
                            : report.development()
                                    .criterionAverages()) {
                        canvas.labelValue(
                                criterion.criterionName(),
                                percentage(
                                        criterion
                                                .averageNormalizedScore()
                                )
                        );
                    }
                }

                canvas.separator();

                canvas.paragraph(
                        "Bu rapor sistemdeki kesinleşmiş "
                        + "yoklama, yayınlanmış "
                        + "değerlendirme ve müfredat "
                        + "ilerleme kayıtlarından "
                        + "oluşturulmuştur."
                );
            }

            document.save(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "PDF report could not be generated.",
                    exception
            );
        }
    }

    private PDType0Font loadFont(
            PDDocument document,
            String path
    ) throws IOException {
        ClassPathResource resource
                = new ClassPathResource(path);

        try (InputStream input
                = resource.getInputStream()) {
            return PDType0Font.load(
                    document,
                    input
            );
        }
    }

    private String formatDate(
            java.time.LocalDate value
    ) {
        return value == null
                ? "Belirtilmedi"
                : value.format(DATE_FORMAT);
    }

    private String percentage(
            BigDecimal value
    ) {
        return value == null
                ? "Veri yok"
                : value.setScale(
                        2,
                        java.math.RoundingMode.HALF_UP
                ).toPlainString() + "%";
    }

    private String percentage(
            double value
    ) {
        return BigDecimal.valueOf(value)
                .setScale(
                        2,
                        java.math.RoundingMode.HALF_UP
                )
                .toPlainString() + "%";
    }

    private String decimal(BigDecimal value) {
        return value == null
                ? "Veri yok"
                : value.setScale(
                        2,
                        java.math.RoundingMode.HALF_UP
                ).toPlainString();
    }

    private String nullSafe(String value) {
        return value == null || value.isBlank()
                ? "Belirtilmedi"
                : value;
    }

    private static final class PdfCanvas
            implements AutoCloseable {

        private final PDDocument document;
        private final PDType0Font regular;
        private final PDType0Font bold;

        private PDPage page;
        private PDPageContentStream stream;
        private float y;

        private PdfCanvas(
                PDDocument document,
                PDType0Font regular,
                PDType0Font bold
        ) throws IOException {
            this.document = document;
            this.regular = regular;
            this.bold = bold;

            newPage();
        }

        private void title(String value)
                throws IOException {
            ensureSpace(35);
            text(value, bold, TITLE_SIZE);
            y -= 12;
        }

        private void heading(String value)
                throws IOException {
            ensureSpace(30);
            text(value, bold, HEADING_SIZE);
            y -= 6;
        }

        private void labelValue(
                String label,
                String value
        ) throws IOException {
            ensureSpace(LINE_HEIGHT);

            textAt(
                    label + ":",
                    bold,
                    BODY_SIZE,
                    PAGE_MARGIN,
                    y
            );

            textAt(
                    value,
                    regular,
                    BODY_SIZE,
                    PAGE_MARGIN + 155,
                    y
            );

            y -= LINE_HEIGHT;
        }

        private void metric(
                String label,
                Object value
        ) throws IOException {
            labelValue(
                    label,
                    String.valueOf(value)
            );
        }

        private void paragraph(String value)
                throws IOException {
            List<String> lines = wrap(
                    value,
                    regular,
                    BODY_SIZE,
                    page.getMediaBox().getWidth()
                    - PAGE_MARGIN * 2
            );

            for (String line : lines) {
                ensureSpace(LINE_HEIGHT);
                text(line, regular, BODY_SIZE);
            }
        }

        private void separator()
                throws IOException {
            ensureSpace(22);

            stream.moveTo(PAGE_MARGIN, y);

            stream.lineTo(
                    page.getMediaBox().getWidth()
                    - PAGE_MARGIN,
                    y
            );

            stream.setStrokingColor(0.78f);
            stream.stroke();

            y -= 18;
        }

        private void text(
                String value,
                PDType0Font font,
                float size
        ) throws IOException {
            textAt(
                    value,
                    font,
                    size,
                    PAGE_MARGIN,
                    y
            );

            y -= size + 6;
        }

        private void textAt(
                String value,
                PDType0Font font,
                float size,
                float x,
                float yPosition
        ) throws IOException {
            stream.beginText();
            stream.setFont(font, size);
            stream.newLineAtOffset(x, yPosition);
            stream.showText(value);
            stream.endText();
        }

        private List<String> wrap(
                String value,
                PDType0Font font,
                float size,
                float maximumWidth
        ) throws IOException {
            List<String> lines
                    = new ArrayList<>();

            StringBuilder current
                    = new StringBuilder();

            for (String word
                    : value.split("\\s+")) {
                String candidate
                        = current.isEmpty()
                        ? word
                        : current + " " + word;

                float width
                        = font.getStringWidth(candidate)
                        / 1000
                        * size;

                if (width > maximumWidth
                        && !current.isEmpty()) {
                    lines.add(current.toString());
                    current = new StringBuilder(word);
                } else {
                    current = new StringBuilder(
                            candidate
                    );
                }
            }

            if (!current.isEmpty()) {
                lines.add(current.toString());
            }

            return lines;
        }

        private void ensureSpace(float needed)
                throws IOException {
            if (y - needed >= PAGE_MARGIN) {
                return;
            }

            newPage();
        }

        private void newPage()
                throws IOException {
            if (stream != null) {
                stream.close();
            }

            page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            stream = new PDPageContentStream(
                    document,
                    page
            );

            y = page.getMediaBox().getHeight()
                    - PAGE_MARGIN;
        }

        @Override
        public void close() throws IOException {
            if (stream != null) {
                stream.close();
            }
        }
    }
}
