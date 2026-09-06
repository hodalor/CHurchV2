import argparse
import base64
import json
import os
import sys
import time
import uuid
from io import BytesIO
from pathlib import Path

from PIL import Image


def emit(payload):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def get_store_path():
    explicit = os.environ.get("BIOMETRIC_BRIDGE_STORE_PATH", "").strip()
    if explicit:
        return Path(explicit)
    return Path(__file__).resolve().parents[2] / ".biometric-registry.json"


def load_registry():
    path = get_store_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_registry(data):
    path = get_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def wait_for_fingerprint(zk, timeout_seconds=20):
    started = time.time()
    while time.time() - started < timeout_seconds:
        capture = zk.AcquireFingerprint()
        if capture:
            template, image = capture
            return bytes(template), bytes(image)
        time.sleep(0.15)
    raise TimeoutError("Fingerprint capture timed out.")


def template_to_base64(template_bytes):
    return base64.b64encode(template_bytes).decode("ascii")


def template_from_base64(template_base64):
    return base64.b64decode(template_base64.encode("ascii"))


def image_to_data_url(image_bytes, width, height):
    image = Image.frombytes("L", (width, height), image_bytes)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def create_device():
    from pyzkfp import ZKFP2

    zk = ZKFP2()
    zk.Init()
    zk.OpenDevice(0)
    return zk


def close_device(zk):
    if not zk:
        return
    try:
        zk.CloseDevice()
    except Exception:
        pass
    try:
        zk.Terminate()
    except Exception:
        pass


def cmd_health():
    zk = None
    try:
        zk = create_device()
        emit(
            {
                "ok": True,
                "provider": "zkteco_sdk",
                "ready": True,
                "deviceCount": 1,
                "deviceName": "SLK20R",
                "serialNumber": zk.dev_serial_number,
                "imageWidth": zk.width,
                "imageHeight": zk.height,
                "registryCount": len(load_registry()),
                "message": "ZKTeco SDK bridge is ready.",
            }
        )
    finally:
        close_device(zk)


def cmd_enroll(args):
    zk = None
    try:
        zk = create_device()
        templates = []
        last_image = b""
        for index in range(3):
            template_bytes, last_image = wait_for_fingerprint(zk, args.timeout)
            templates.append(template_bytes)
            time.sleep(1.0)

        merged_template, _merged_len = zk.DBMerge(*templates)
        merged_bytes = bytes(merged_template)
        template_ref = args.template_ref or f"fp_{uuid.uuid4().hex}"

        registry = load_registry()
        registry[template_ref] = {
          "templateRef": template_ref,
          "templateData": template_to_base64(merged_bytes),
          "provider": "zkteco_sdk",
          "deviceName": "SLK20R",
          "label": args.label or "",
          "subjectType": args.subject_type or "",
          "subjectId": args.subject_id or "",
          "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        save_registry(registry)

        emit(
            {
                "ok": True,
                "provider": "zkteco_sdk",
                "templateRef": template_ref,
                "templateData": registry[template_ref]["templateData"],
                "deviceName": "SLK20R",
                "qualityScore": None,
                "captureCount": 3,
                "previewImage": image_to_data_url(last_image, zk.width, zk.height) if last_image else "",
                "message": "Fingerprint enrolled with ZKTeco SDK.",
            }
        )
    finally:
        close_device(zk)


def cmd_identify(args):
    zk = None
    try:
        registry = load_registry()
        if not registry:
            raise RuntimeError("No enrolled fingerprints are stored on this machine yet.")

        zk = create_device()

        id_to_ref = {}
        fid = 1
        for template_ref, entry in registry.items():
            template_bytes = template_from_base64(entry["templateData"])
            zk.DBAdd(fid, template_bytes)
            id_to_ref[fid] = template_ref
            fid += 1

        captured_template, captured_image = wait_for_fingerprint(zk, args.timeout)
        matched_fid, score = zk.DBIdentify(captured_template)
        if matched_fid <= 0 or matched_fid not in id_to_ref:
            raise RuntimeError("Fingerprint was captured but no enrolled match was found.")

        template_ref = id_to_ref[matched_fid]
        entry = registry.get(template_ref, {})
        emit(
            {
                "ok": True,
                "provider": "zkteco_sdk",
                "templateRef": template_ref,
                "deviceName": "SLK20R",
                "score": score,
                "label": entry.get("label", ""),
                "subjectType": entry.get("subjectType", ""),
                "subjectId": entry.get("subjectId", ""),
                "previewImage": image_to_data_url(captured_image, zk.width, zk.height) if captured_image else "",
                "message": "Fingerprint matched with ZKTeco SDK.",
            }
        )
    finally:
        close_device(zk)


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("health")

    enroll_parser = subparsers.add_parser("enroll")
    enroll_parser.add_argument("--template-ref", default="")
    enroll_parser.add_argument("--label", default="")
    enroll_parser.add_argument("--subject-type", default="")
    enroll_parser.add_argument("--subject-id", default="")
    enroll_parser.add_argument("--timeout", type=int, default=20)

    identify_parser = subparsers.add_parser("identify")
    identify_parser.add_argument("--timeout", type=int, default=20)

    args = parser.parse_args()

    try:
        if args.command == "health":
            cmd_health()
            return
        if args.command == "enroll":
            cmd_enroll(args)
            return
        if args.command == "identify":
            cmd_identify(args)
            return
    except Exception as error:
        emit(
            {
                "ok": False,
                "message": str(error),
            }
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
