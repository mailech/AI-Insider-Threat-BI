from app.services.features import feature_vector, FEATURE_NAMES

def test_feature_schema():
    v=feature_vector("usb_file_copy",23,50_000_000,10,True,3)
    assert len(v)==len(FEATURE_NAMES)==13
    assert v[1]==1 and v[5]==1 and v[9]==1
