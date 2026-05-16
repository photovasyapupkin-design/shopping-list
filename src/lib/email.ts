import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendOtpEmail(input: { email: string; otp: string; type: string }) {
  const client = getResend();
  if (!client) {
    console.info(`OTP for ${input.email} (${input.type}): ${input.otp}`);
    return;
  }

  await client.emails.send({
    from: process.env.AUTH_EMAIL_FROM ?? "Shopping List <onboarding@resend.dev>",
    to: input.email,
    subject: "Your shopping list sign-in code",
    text: `Your ${input.type} code is ${input.otp}. It expires in five minutes.`,
  });
}
