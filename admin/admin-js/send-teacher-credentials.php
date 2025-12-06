<?php
// send-teacher-credentials.php - SIMPLIFIED WORKING VERSION
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Turn on error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get the data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit;
}

// Check required fields
if (!isset($input['email']) || !isset($input['id']) || !isset($input['password']) || !isset($input['firstName'])) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

$to = $input['email'];
$id = $input['id'];
$password = $input['password'];
$firstName = $input['firstName'];
$lastName = $input['lastName'] ?? '';
$fullName = trim($firstName . ' ' . $lastName);

try {
    // Load PHPMailer - use correct relative paths
    require 'phpmailer/src/Exception.php';
    require 'phpmailer/src/PHPMailer.php';
    require 'phpmailer/src/SMTP.php';

    $mail = new PHPMailer\PHPMailer\PHPMailer(true);

    // Server settings (same as your test file)
    $mail->isSMTP();
    $mail->Host       = 'smtp.hostinger.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'administrator@zsnhs.wmsu-research.com';
    $mail->Password   = 'B0mbacl@t';
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port       = 465;
    $mail->Timeout    = 30;

    // Recipients
    $mail->setFrom('administrator@zsnhs.wmsu-research.com', 'Smart Attendance System');
    $mail->addAddress($to, $fullName);

    // Reply-to address
    $mail->addReplyTo('administrator@zsnhs.wmsu-research.com', 'System Administrator');

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Welcome to Smart Attendance System - Your Account Credentials';

    // HTML message
    $htmlContent = "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .header { background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0; margin: -20px -20px 20px -20px; }
            .content { padding: 20px 0; }
            .credentials { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>Smart Attendance System</h2>
            </div>
            <div class='content'>
                <h3>Hello $firstName,</h3>
                <p>Your teacher account has been successfully created in the Smart Attendance System.</p>
                
                <div class='credentials'>
                    <p><strong>Your login credentials:</strong></p>
                     <p><strong>Email:</strong> $to</p>
                    <p><strong>Password:</strong> $password</p>
                </div>
                
                <p>Please use these credentials to log into the system.</p>
                <p><strong>Important:</strong> For security reasons,  please do not share your login credentials.</p>
                
                <p>Best regards,<br>Administrator<br>Smart Attendance System</p>
            </div>
            <div class='footer'>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    $mail->Body = $htmlContent;

    // Plain text version
    $plainText = "Hello $firstName,\n\n" .
        "Your teacher account has been created in the Smart Attendance System.\n\n" .
        "Your login credentials:\n" .
        "Email: $to\n" .
        "Password: $password\n\n" .
        "Please use these credentials to log into the system.\n" .
        "Important: For security reasons, please change your password after your first login.\n\n" .
        "Best regards,\n" .
        "Administrator\n" .
        "Smart Attendance System";

    $mail->AltBody = $plainText;

    // Send email
    if ($mail->send()) {
        echo json_encode(['success' => true, 'message' => 'Email sent successfully']);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to send email: ' . $mail->ErrorInfo,
            'credentials' => [
                'id' => $id,
                'password' => $password
            ]
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'credentials' => [
            'id' => $id,
            'password' => $password
        ]
    ]);
}
