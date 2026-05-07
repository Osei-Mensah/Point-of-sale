const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("EMAIL CONFIG ERROR:", error);
  } else {
    console.log("✅ Email server ready");
  }
});

const sendReceiptEmail = async ({
  email,
  customerName,
  total,
  pointsUsed,
  pointsEarned,
  items = [],
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Purchase Receipt",
    html: `
  <h2 style="text-align:center;">🧾 RECEIPT</h2>
  <p>Customer: ${customerName}</p>

  <table style="width:100%; border-collapse: collapse;" border="1">
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${item.price}</td>
          <td>${item.price * item.quantity}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <p><strong>Total Paid:</strong> GHS ${total}</p>
  <p>Points Used: ${pointsUsed}</p>
  <p>Points Earned: ${pointsEarned}</p>

  <p style="text-align:center;">Thank you for your purchase!</p>
`,
  };

  await transporter.sendMail(mailOptions);
};
const sendOTPEmail = async (email, name, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    html: `
      <h2>Verification Code</h2>
      <p>Hello ${name || "Customer"},</p>
      <h1 style="letter-spacing:5px;">${otp}</h1>
      <p>This code expires in 5 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
module.exports = { sendReceiptEmail, sendOTPEmail };
