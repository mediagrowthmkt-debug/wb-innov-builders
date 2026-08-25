<?php
// Innov Builders — endpoint de leads do site -> GHL CRM (GERADO por build.py)
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405); echo json_encode(['ok'=>false,'error'=>'method']); exit;
}

// ---- credenciais (NUNCA no repo): env OU api/config.php OU 1 nivel acima do public_html
$GHL_TOKEN = getenv('GHL_TOKEN') ?: '';
$GHL_LOCATION = getenv('GHL_LOCATION') ?: '';
$GHL_PIPELINE = getenv('GHL_PIPELINE') ?: '';
$GHL_STAGE = getenv('GHL_STAGE') ?: '';
$GHL_CF_BRIEF_CONTACT = getenv('GHL_CF_BRIEF_CONTACT') ?: '';
$GHL_CF_BRIEF_OPP = getenv('GHL_CF_BRIEF_OPP') ?: '';
if (!$GHL_TOKEN) {
  foreach ([__DIR__.'/config.php', dirname($_SERVER['DOCUMENT_ROOT']).'/ghl-config.php'] as $cf) {
    if (is_file($cf)) { require $cf; break; }
  }
}
if (!$GHL_TOKEN || !$GHL_LOCATION) {
  http_response_code(500); echo json_encode(['ok'=>false,'error'=>'config']); exit;
}

// ---- input (form-urlencoded/multipart OU JSON)
$in = $_POST;
if (empty($in)) { $j = json_decode(file_get_contents('php://input'), true); if (is_array($j)) $in = $j; }

// honeypot: se preenchido, e bot -> finge sucesso e ignora
if (!empty($in['_hp'])) { echo json_encode(['ok'=>true]); exit; }

$name    = trim($in['name']    ?? '');
$email   = trim($in['email']   ?? '');
$phone   = trim($in['phone']   ?? '');
$service = trim($in['service'] ?? '');
$zip     = trim($in['zip']     ?? '');
$message = trim($in['message'] ?? '');
$page    = trim($in['page']    ?? '');
$consent = !empty($in['sms_consent']);

if ($email === '' && $phone === '') {
  http_response_code(422); echo json_encode(['ok'=>false,'error'=>'need_contact']); exit;
}

// nome -> primeiro/ultimo
$first = $name; $last = '';
if (strpos($name, ' ') !== false) { $p = explode(' ', $name, 2); $first = trim($p[0]); $last = trim($p[1]); }

$tags = ['Website Lead'];
if ($service !== '') $tags[] = 'Service: '.$service;

// resumo com TUDO que a pessoa preencheu -> vai pro campo "Brief Description of the Project"
$brief = "";
if ($service !== '') $brief .= "Service: $service\n";
if ($zip !== '')     $brief .= "Zip: $zip\n";
if ($message !== '') $brief .= "Message: $message\n";
$brief .= "SMS consent: ".($consent ? "yes" : "no")."\n";
if ($page !== '')    $brief .= "Page: $page\n";
$brief = trim($brief);

$contact = [
  'locationId' => $GHL_LOCATION,
  'firstName'  => $first,
  'lastName'   => $last,
  'name'       => $name,
  'email'      => $email,
  'phone'      => $phone,
  'source'     => 'website',
  'tags'       => $tags,
  'postalCode' => $zip,
];
foreach (['firstName','lastName','name','email','phone','postalCode'] as $k) {
  if ($contact[$k] === '') unset($contact[$k]);
}
if ($GHL_CF_BRIEF_CONTACT !== '') {
  $contact['customFields'] = [['id'=>$GHL_CF_BRIEF_CONTACT, 'value'=>$brief]];
}

function ghl_call($url, $token, $body) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($body),
    CURLOPT_HTTPHEADER => [
      'Authorization: Bearer '.$token,
      'Version: 2021-07-28',
      'Content-Type: application/json',
      'Accept: application/json',
    ],
    CURLOPT_TIMEOUT => 25,
  ]);
  $res = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$code, $res];
}

list($code, $res) = ghl_call('https://services.leadconnectorhq.com/contacts/upsert', $GHL_TOKEN, $contact);
$data = json_decode($res, true);
$cid = $data['contact']['id'] ?? ($data['id'] ?? null);

if ($code >= 200 && $code < 300 && $cid) {
  // nota com tudo que o cliente preencheu
  $note = "Website form - No-Cost Estimate\n"
        . ($service ? "Service: $service\n" : "")
        . ($zip     ? "Zip: $zip\n"         : "")
        . ($message ? "Message: $message\n" : "")
        . "SMS consent: " . ($consent ? "yes" : "no") . "\n"
        . ($page ? "Page: $page\n" : "");
  ghl_call('https://services.leadconnectorhq.com/contacts/'.$cid.'/notes', $GHL_TOKEN, ['body'=>$note]);
  // cria a oportunidade no pipeline (Sales Pipeline 2026 / New Lead) se configurado
  if (!empty($GHL_PIPELINE) && !empty($GHL_STAGE)) {
    $oppName = ($name !== '' ? $name : 'Website Lead') . ($service !== '' ? ' - '.$service : '');
    $opp = [
      'pipelineId'      => $GHL_PIPELINE,
      'locationId'      => $GHL_LOCATION,
      'pipelineStageId' => $GHL_STAGE,
      'name'            => $oppName,
      'status'          => 'open',
      'contactId'       => $cid,
      'source'          => 'website',
    ];
    if ($GHL_CF_BRIEF_OPP !== '') $opp['customFields'] = [['id'=>$GHL_CF_BRIEF_OPP, 'value'=>$brief]];
    ghl_call('https://services.leadconnectorhq.com/opportunities/', $GHL_TOKEN, $opp);
  }
  echo json_encode(['ok'=>true]); exit;
}

http_response_code(502);
echo json_encode(['ok'=>false, 'error'=>'ghl', 'code'=>$code]);
