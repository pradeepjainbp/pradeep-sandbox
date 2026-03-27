import swisseph as swe
import traceback

try:
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    jd = swe.julday(2026, 3, 27, 12.0)
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    pos, ret = swe.calc_ut(jd, swe.SUN, flags)
    print("SUCCESS: Computed Sun position:", pos[0])
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
