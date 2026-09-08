require('dotenv').config()
const express = require("express")
const pool = require("./config/pool")
const app = express()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const generatetoken = require("./utils/jwt")
const authenticate = require('./middleware/auth');
const cors = require('cors');
const nodemailer = require("nodemailer");
const upload = require("./middleware/multer")
const addProduct = require("./controller/add.product")
const fs = require("fs");
const path = require("path");
const logActivity = require("./utils/activityLogger")

app.use(express.json())
app.use(cors())


const otpStore = {};
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * GET used to get the user full profile
 * endpoints => /inventory/user_profile
 * In this we have to send the authentication bearer token
  */
app.get('/inventory/user_profile', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email FROM users WHERE id = ?',
      [req.user.id]
    );

    res.status(200).json(rows[0]);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

/**
 * GET request to fetch the user
 * endpoints => /inventory/all_users
 */

app.get("/inventory/all_users", async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM users',
  )

  res.status(201).json({
    message: "Users Fetched successfully",
    rows: rows
  })
})

/**
 * POST to add user in database
 * enpoints => /inventory/add_users
 * Important paramaters => name, email, password are required by the user
 * Use for Signup process
 */
app.post("/inventory/signup", async (req, res) => {
  try {
    const { name, email, password_hash } = req.body
    //check if user exists
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE email=?',
      [email]
    )
    if (existing.length > 0) {
      return res.status(400).json({
        message: "Email is already registered"
      })
    }
    const hashpassword = await bcrypt.hash(password_hash, 10)

    const [result] = await pool.query(
      'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)',
      [name, email, hashpassword]
    )
    res.status(201).json({
      message: "Signup Successfully",
      userID: result.insertId
    })
  } catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
})

/**
 * PATCH to update the detail of the user
 * endpoints => /inventory/update_user_detail/:id
 */
app.patch("/inventory/update_users/:id", async (req, res) => {
  try {
    const { name, email } = req.body
    const { id } = req.params;

    if (name) {
      await pool.query(
        'UPDATE users SET name=? WHERE id =?',
        [name, id]
      )
    }
    if (email) {
      await pool.query(
        'UPDATE users SET email = ? WHERE id=?',
        [email, id]
      )
    }

    res.status(201).json({
      message: "User updated successfully"
    })
  } catch (error) {
    res.status(500).json({
      error: error.message
    })
  }
})

/**
 * PATCH to update the password of the user
 * endpoints => /inventory/forgot_password
 */
app.post("/inventory/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await pool.query(
      "SELECT id,email FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = users[0];

    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_TOKEN || "inventory_crm_secret_key_2026",
      { expiresIn: "5m" }
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetLink = `${clientUrl}/reset-password/${resetToken}`;

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"InventoryPro" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Reset Your Password — InventoryPro",
          html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6f8">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Email container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo / Brand row -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2563eb;border-radius:10px;padding:10px 18px;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">InventoryPro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- White card -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:40px 40px 32px;">

              <!-- Icon circle -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:56px;height:56px;background-color:#eff6ff;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="font-size:26px;line-height:56px;">&#128274;</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Reset your password</h1>
              <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;text-align:center;line-height:1.6;">We received a request to reset your InventoryPro password.<br/>Click the button below to create a new password.</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${resetLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:14px 36px;border-radius:8px;">Reset Password</a>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-align:center;">
                This link expires in <strong style="color:#475569;">5 minutes</strong>.
              </p>

              <!-- Fallback URL box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td bgcolor="#f8fafc" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">If the button doesn&apos;t work, copy this link:</p>
                    <p style="margin:0;font-family:monospace,Courier New;font-size:12px;color:#2563eb;word-break:break-all;">${resetLink}</p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 20px;">
                <tr>
                  <td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Security note -->
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                If you didn&apos;t request this, you can safely ignore this email.
                Your password will remain unchanged.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} InventoryPro &bull; All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`,
        });
      } else {
        console.warn("⚠️ SMTP credentials not configured. Reset link generated:");
        console.log(`🔑 [DEV RESET LINK] for ${email}: ${resetLink}`);
      }
    } catch (mailErr) {
      console.warn("⚠️ Nodemailer Warning:", mailErr.message);
      console.log(`🔑 [DEV RESET LINK] for ${email}: ${resetLink}`);
    }

    res.status(200).json({
      message: "Password reset link processed successfully",
      resetLink: process.env.NODE_ENV === "development" ? resetLink : undefined,
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * PATCH use to reset the password of the user
 * endpoints => /inventory/reser-password/:token
 */
app.patch("/inventory/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password_hash } = req.body;

    if (!password_hash) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_TOKEN || "inventory_crm_secret_key_2026"
    );

    const hashedPassword = await bcrypt.hash(
      password_hash,
      10
    );

    const [result] = await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [hashedPassword, decoded.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Password updated successfully",
    });

  } catch (error) {
    return res.status(400).json({
      message: "Invalid or expired token",
    });
  }
});

/**
 * DELETE to remove user from the databse
 * endpoints => /inventory/remove_user/:id
 */
app.delete("/inventory/remove_user/:id", async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    )
    if (result.affectedRows === 0) {
      res.status(400).json({
        message: "User not found"
      })
    }
    res.status(201).json({
      message: "User remove from database successfully"
    })
  } catch (error) {
    res.status(400).json({
      error: error.message
    })
  }
})

/**
 * GET to login in our website
 * endpoints => /inventory/login
 */
app.post("/inventory/login", async (req, res) => {
  try {
    const { email, password_hash } = req.body;
    if (!email || !password_hash) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [result] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email)=?',
      [cleanEmail]
    );

    if (result.length === 0) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    let user = result[0];
    const ismatch = await bcrypt.compare(
      password_hash,
      user.password_hash
    );

    if (!ismatch) {
      return res.status(400).json({
        message: "Incorrect Password"
      });
    }

    const token = generatetoken(user.id, user.email);
    await pool.query(
      'UPDATE users SET token = ? WHERE id = ?',
      [token, user.id]
    );

    res.status(200).json({
      message: "login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

/**
 * POST for logging out 
 * endpoints => /inventory/logout
 * Important paramters Authorization Bearer token in header of postman
 */
app.post('/inventory/logout', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];

    await pool.query(
      'INSERT INTO token_blacklist (token) VALUES (?)',
      [token]
    );

    await pool.query(
      'UPDATE users SET token = NULL WHERE id = ?',
      [req.user.id]
    );
    res.status(200).json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


/**
 * POST this method is used to send the otp on the user email
 * endpoints => /inventory/send-otp
 */
app.post("/inventory/send-otp", async (req, res) => {
  try {
    const { name, email, password_hash } = req.body;

    const [existing] = await pool.query(
      "SELECT * FROM users WHERE email=?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    // Store temporarily with 5 minute expiration timestamp
    otpStore[email] = {
      otp,
      name,
      password_hash,
      expires: Date.now() + 5 * 60 * 1000
    };

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"InventoryPro" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your Verification Code — InventoryPro",
          html: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6f8">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Email container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo / Brand row -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#2563eb;border-radius:10px;padding:10px 18px;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">InventoryPro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- White card -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:40px 40px 32px;">

              <!-- Icon circle -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:56px;height:56px;background-color:#eff6ff;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="font-size:26px;line-height:56px;">&#9993;</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#0f172a;text-align:center;">Verify your email</h1>
              <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#64748b;text-align:center;line-height:1.6;">
                Hi ${name}, welcome to InventoryPro!<br/>Enter this code to complete your account setup.
              </p>

              <!-- OTP Box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Your verification code</p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#f8fafc" style="background-color:#f8fafc;border:2px solid #2563eb;border-radius:10px;padding:18px 48px;text-align:center;">
                          <span style="font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:700;color:#2563eb;letter-spacing:10px;">${otp}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <p style="margin:16px 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#94a3b8;text-align:center;">
                This code expires in <strong style="color:#475569;">5 minutes</strong>. Do not share it with anyone.
              </p>

              <!-- Divider -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
                <tr>
                  <td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Security note -->
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                If you didn&apos;t create an account on InventoryPro, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} InventoryPro &bull; All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`
        });
      } else {
        console.warn("⚠️ SMTP credentials not configured. OTP generated for dev mode:");
        console.log(`🔑 [DEV OTP] for ${email}: ${otp}`);
      }
    } catch (mailErr) {
      console.warn("⚠️ Nodemailer Warning:", mailErr.message);
      console.log(`🔑 [DEV OTP] for ${email}: ${otp}`);
    }

    res.status(200).json({
      message: "OTP sent successfully",
      otp: process.env.NODE_ENV === "development" ? otp : undefined
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST this method is used to verify the otp which is send on the user email
 * endpoints => /inventory/verify-otp
 */
app.post("/inventory/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const data = otpStore[email];

    if (!data) {
      return res.status(400).json({
        message: "OTP not found"
      });
    }

    if (Date.now() > data.expires) {
      delete otpStore[email];
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    if (parseInt(otp) !== data.otp) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    const hashedPassword = await bcrypt.hash(
      data.password_hash,
      10
    );

    const [result] = await pool.query(
      "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
      [data.name, email, hashedPassword]
    );

    delete otpStore[email];

    res.status(201).json({
      message: "Signup successful",
      userId: result.insertId
    });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
});


/**
 * POST this method is used to add the product for the logged in user
 * endpoints => /inventory/add-product
 */
app.post("/inventory/add-products", authenticate, upload.single("image"), addProduct);

/**
 * GET this method is used to get all the products of the logged in users
 * endpoints => /inventory/get-product
 */
app.get("/inventory/get-products", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE user_id = ?",
      [req.user.id]
    );

    res.status(200).json({
      products: rows,
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * USE it is use to access all the files present in the upload folder
 * endpoints => /uploads
 */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/**
 * DELETE this delete is used to delete the product for the particular user logged in user
 * endpoints => /inventory/delete
 */


app.delete("/inventory/delete/:pro_id", authenticate, async (req, res) => {
  try {
    const { pro_id } = req.params;

    const [products] = await pool.query(
      "SELECT name, image FROM products WHERE pro_id = ?",
      [pro_id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const product = products[0];

    if (product.image) {
      const imagePath = path.join(
        __dirname,
        "../uploads",
        product.image
      );

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await pool.query(
      "DELETE FROM products WHERE pro_id = ?",
      [pro_id]
    );

    await logActivity(
      req.user.id,
      "PRODUCT_DELETED",
      product.name
    );

    res.json({
      message: "Product and image deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
});

/**
 * PATCH this is used to update the details of the products 
 * endpoints =>     /inventory/update/:pro_id
 */
app.patch("/inventory/update/:pro_id", authenticate, async (req, res) => {
  try {
    const { pro_id } = req.params;
    const updates = req.body;

    const [product] = await pool.query(
      "SELECT name FROM products WHERE pro_id = ?",
      [pro_id]
    );

    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    values.push(pro_id);

    const query = `
      UPDATE products
      SET ${fields.join(", ")}
      WHERE pro_id = ?
    `;

    await pool.query(query, values);

    await logActivity(
      req.user.id,
      "PRODUCT_UPDATED",
      product[0]?.name || "Product"
    );

    res.json({
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
});

app.get("/inventory/activity", authenticate, async (req, res) => {
  try {
    const [activities] = await pool.query(
      `SELECT *
       FROM activity_logs
       WHERE user_id=?
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.user.id]
    );

    res.json({
      activities: activities || [],
    });
  } catch (error) {
    console.error("Activity fetch error:", error);
    res.json({
      activities: [],
    });
  }
});


app.post("/inventory/send-low-stock-alert", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      `SELECT name, email FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    const [products] = await pool.query(
      `
        SELECT name, stock
        FROM products
        WHERE user_id = ?
          AND stock <= 5
      `,
      [userId]
    );

    if (products.length === 0) {
      return res.json({
        success: true,
        message: "No low stock products",
      });
    }

    const productList = products
      .map(
        (product) => `
          <li style="margin-bottom: 8px;">
            <strong>${product.name}</strong> — ${product.stock} left
          </li>
        `
      )
      .join("");

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"Inventory Pro" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "⚠️ Low Stock Alert - Inventory Pro",
          html: `
            <div style="font-family: Arial, sans-serif; background: #f4f7fc; padding: 30px;">
              <div style="max-width: 650px; margin: auto; background: white; border-radius: 16px; overflow: hidden;">
                <div style="background: #2563eb; padding: 28px; text-align: center; color: white;">
                  <h1 style="margin: 0;">📦 Inventory Pro</h1>
                  <p style="margin: 10px 0 0;">Smart Inventory Management</p>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #0f172a;">Hello ${user.name} 👋</h2>
                  <p style="color: #475569; line-height: 1.7;">Some products in your inventory are running low.</p>
                  <div style="background: #fff7ed; border-left: 5px solid #f97316; padding: 18px; border-radius: 10px;">
                    <h3 style="margin-top: 0; color: #ea580c;">⚠️ Low Stock Products</h3>
                    <ul style="color: #334155; line-height: 1.7;">
                      ${productList}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          `,
        });
      } else {
        console.log(`⚠️ Low stock alert triggered for ${user.email} (${products.length} products low)`);
      }
    } catch (mailErr) {
      console.warn("⚠️ Low stock mail warning:", mailErr.message);
    }

    return res.json({
      success: true,
      message: "Low-stock alert processed",
    });
  } catch (err) {
    console.error("Email Alert Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
module.exports = app