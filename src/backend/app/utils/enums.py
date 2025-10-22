from enum import IntEnum


class Department(IntEnum):
    MUNICIPAL_GOVERNANCE = 0
    EDUCATION_HEALTH_WELFARE = 1
    INFRASTRUCTURE_UTILITIES = 2
    SECURITY_LAW_ENFORCEMENT = 3


class Urgency(IntEnum):
    NORMAL = 0
    URGENT = 1
    HIGHLY_URGENT = 2


class ComplaintStatus(IntEnum):
    PENDING = 0
    IN_PROGRESS = 1
    RESOLVED = 2
    CLOSED = 3


class UserRole(IntEnum):
    CITIZEN = 0
    DEPARTMENT_OFFICIAL = 1
    MAYOR = 2
    SUPER_ADMIN = 3
