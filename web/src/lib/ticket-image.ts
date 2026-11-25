import { ticketBars } from "./industries";

const showtimeFormat = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Nairobi",
});

export function showtimeLabel(value: string) {
  return showtimeFormat.format(new Date(value));
}

export function downloadTicketImage(ticket: {
  code: string;
  title: string;
  details: string[];
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 920;
  canvas.height = 460;
  const image = canvas.getContext("2d");
  if (!image)
    throw new Error("Your browser could not create the ticket image.");

  image.fillStyle = "#fff";
  image.fillRect(0, 0, canvas.width, canvas.height);
  image.fillStyle = "#17442c";
  image.fillRect(0, 0, canvas.width, 72);
  image.fillStyle = "#fff";
  image.font = "600 25px sans-serif";
  image.fillText("BiasharaOS  ·  Admission ticket", 40, 46);
  image.fillStyle = "#171d19";
  image.font = "600 38px sans-serif";
  image.fillText(ticket.title, 40, 129, 840);
  image.font = "26px sans-serif";
  ticket.details.forEach((line, index) =>
    image.fillText(line, 40, 177 + index * 37, 840),
  );

  const widths = Array.from(`*${ticket.code}*`).flatMap((letter) =>
    [...ticketBars[letter], "n"].map((width) => (width === "w" ? 3 : 1)),
  );
  const scale = Math.floor(
    840 / widths.reduce((total, width) => total + width, 0),
  );
  let offset =
    (canvas.width - scale * widths.reduce((total, width) => total + width, 0)) /
    2;
  image.fillStyle = "#000";
  widths.forEach((width, index) => {
    if (index % 2 === 0)
      image.fillRect(Math.floor(offset), 312, width * scale, 90);
    offset += width * scale;
  });
  image.textAlign = "center";
  image.font = "26px monospace";
  image.fillText(ticket.code, canvas.width / 2, 436);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `biashara-ticket-${ticket.code}.png`;
  link.click();
}
