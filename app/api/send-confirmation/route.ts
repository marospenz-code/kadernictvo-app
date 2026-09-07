import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      customerName,
      businessName,
      service,
      date,
      time,
      duration,
    } = body;

    if (
      !email ||
      !customerName ||
      !businessName ||
      !service ||
      !date ||
      !time
    ) {
      return NextResponse.json(
        {
          error:
            "Chýbajú údaje pre odoslanie e-mailu.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await resend.emails.send({
        from:
          "Rezervácie <onboarding@resend.dev>",

        to: [email],

        subject:
          `Potvrdenie rezervácie – ${businessName}`,

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              color: #222222;
              line-height: 1.6;
            "
          >
            <h1>
              Rezervácia potvrdená
            </h1>

            <p>
              Dobrý deň ${customerName},
            </p>

            <p>
              vaša rezervácia v prevádzke
              <strong>${businessName}</strong>
              bola úspešne vytvorená.
            </p>

            <div
              style="
                background: #f5f5f5;
                padding: 20px;
                border-radius: 12px;
                margin: 24px 0;
              "
            >
              <p>
                <strong>Služba:</strong>
                ${service}
              </p>

              <p>
                <strong>Dátum:</strong>
                ${date}
              </p>

              <p>
                <strong>Čas:</strong>
                ${time}
              </p>

              <p>
                <strong>Dĺžka:</strong>
                ${duration} min
              </p>
            </div>

            <p>
              Ďakujeme za rezerváciu.
            </p>

            <p>
              <strong>
                ${businessName}
              </strong>
            </p>
          </div>
        `,
      });

    if (error) {
      console.error(
        "RESEND ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "EMAIL API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "E-mail sa nepodarilo odoslať.",
      },
      {
        status: 500,
      }
    );
  }
}