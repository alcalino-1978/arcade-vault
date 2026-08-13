"use server";

import { Resend } from "resend";

type ContactFormData = {
  name: string;
  email: string;
  message: string;
};

type SendContactMessageResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(
  data: ContactFormData
): Promise<SendContactMessageResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "alcalino_78@hotmail.com",
      replyTo: data.email,
      subject: `Nuevo mensaje de contacto de ${data.name}`,
      text: `Nombre: ${data.name}\nEmail: ${data.email}\n\nMensaje:\n${data.message}`,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo." };
  }
}
