from app.security import make_password, verify_password, create_token, decode_token

def test_password_and_jwt():
    p=make_password("StrongPass123!")
    assert verify_password("StrongPass123!",p)
    assert not verify_password("wrong",p)
    tok=create_token(1,"tester","analyst")
    claims=decode_token(tok)
    assert claims["sub"]=="1" and claims["role"]=="analyst"
