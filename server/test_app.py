import os
import unittest

from server import app

TEST_DB = os.path.join(os.getcwd(), "server", "test-atlas.db")


def remove_test_db() -> None:
    for suffix in ("", "-wal", "-shm"):
        try:
            os.remove(TEST_DB + suffix)
        except FileNotFoundError:
            pass


class ContactRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        remove_test_db()
        app.DB_PATH = TEST_DB
        app.init_db()

    def tearDown(self) -> None:
        remove_test_db()

    def test_seeds_demo_contacts_once(self) -> None:
        self.assertEqual(app.count_contacts(), 10)
        app.init_db()
        self.assertEqual(app.count_contacts(), 10)

    def test_replace_list_and_delete(self) -> None:
        contact = {
            "id": "test-1",
            "name": "测试联系人",
            "company": "测试公司",
            "methods": [
                {"id": "m1", "kind": "phone", "label": "手机", "value": "138 0000 0000"}
            ],
            "favorite": True,
        }
        app.replace_contacts([contact])
        self.assertEqual(app.count_contacts(), 1)
        loaded = app.list_contacts()
        self.assertEqual(loaded[0]["name"], "测试联系人")
        self.assertTrue(loaded[0]["favorite"])

        app.upsert_contact({**contact, "name": "更新后的名字"})
        self.assertEqual(app.list_contacts()[0]["name"], "更新后的名字")

        self.assertTrue(app.delete_contact("test-1"))
        self.assertFalse(app.delete_contact("test-1"))
        self.assertEqual(app.count_contacts(), 0)

    def test_rejects_invalid_contact(self) -> None:
        with self.assertRaises(ValueError):
            app.replace_contacts([{"name": "缺少 ID"}])
        with self.assertRaises(ValueError):
            app.replace_contacts("not a list")


if __name__ == "__main__":
    unittest.main()
