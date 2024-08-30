use gstd::collections::HashMap;
use gstd::{exec, msg, prelude::*, ActorId, Decode, Encode, String, TypeInfo};
use sails_rs::gstd::service;

pub type Time = String;
static mut DATA: Option<DnsData> = None;

pub use utils::*;

pub mod funcs;
pub(crate) mod utils;

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Encode, Decode, TypeInfo)]
pub enum Event {
    NewProgramAdded {
        name: String,
        contract_info: ContractInfo,
    },
    ProgramIdChanged {
        name: String,
        contract_info: ContractInfo,
    },
    ProgramDeleted {
        name: String,
    },
    AdminAdded {
        name: String,
        contract_info: ContractInfo,
    },
    AdminRemoved {
        name: String,
        contract_info: ContractInfo,
    }
}

#[derive(Debug)]
pub struct DnsData {
    pub active_contracts: HashMap<String, ContractInfo>,
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Encode, Decode, TypeInfo)]
pub struct ContractInfo {
    pub admins: Vec<ActorId>,
    pub program_id: ActorId,
    pub registration_time: String,
}

impl DnsData {
    pub fn get_mut() -> &'static mut Self {
        unsafe { DATA.as_mut().expect("DnsData::seed() should be called") }
    }
    pub fn get() -> &'static Self {
        unsafe { DATA.as_ref().expect("DnsData::seed() should be called") }
    }
}

#[derive(Clone)]
pub struct Service;

impl Service {
    pub fn seed() -> Self {
        unsafe {
            DATA = Some(DnsData {
                active_contracts: HashMap::new(),
            });
        }
        Self
    }
}

#[service(events = Event)]
impl Service {
    pub fn new() -> Self {
        Self
    }
    pub fn add_new_program(&mut self, name: String, program_id: ActorId) {
        let contract_info = utils::panicking(|| {
            funcs::add_new_program(
                DnsData::get_mut(),
                name.clone(),
                program_id,
                msg::source(),
                exec::block_timestamp(),
            )
        });
        let _ = self.notify_on(Event::NewProgramAdded {
            name,
            contract_info,
        });
    }

    pub fn add_admin_to_program(&mut self, name: String, new_admin: ActorId) {
        let contract_info = utils::panicking(|| {
            funcs::add_admin_to_program(
                DnsData::get_mut(),
                name.clone(),
                new_admin,
                msg::source(),
            )
        });
        let _ = self.notify_on(Event::AdminAdded {
            name,
            contract_info,
        });
    }

    pub fn remove_admin_from_program(&mut self, name: String, admin_to_remove: ActorId) {
        let contract_info = utils::panicking(|| {
            funcs::remove_admin_from_program(
                DnsData::get_mut(),
                name.clone(),
                admin_to_remove,
                msg::source(),
            )
        });
        let _ = self.notify_on(Event::AdminRemoved {
            name,
            contract_info,
        });
    }
    pub fn change_program_id(&mut self, name: String, new_program_id: ActorId) {
        let contract_info = utils::panicking(|| {
            funcs::change_program_id(
                DnsData::get_mut(),
                name.clone(),
                new_program_id,
                msg::source(),
                exec::block_timestamp(),
            )
        });
        let _ = self.notify_on(Event::ProgramIdChanged {
            name,
            contract_info,
        });
    }
    pub fn delete_program(&mut self, name: String) {
        utils::panicking(|| funcs::delete_program(DnsData::get_mut(), name.clone(), msg::source()));
        let _ = self.notify_on(Event::ProgramDeleted { name });
    }
    pub fn delete_me(&mut self) {
        let name = utils::panicking(|| funcs::delete_me(DnsData::get_mut(), msg::source()));
        let _ = self.notify_on(Event::ProgramDeleted { name });
    }
    pub fn all_contracts(&self) -> Vec<(String, ContractInfo)> {
        DnsData::get()
            .active_contracts
            .clone()
            .into_iter()
            .collect()
    }
    pub fn get_contract_info_by_name(&self, name: String) -> Option<ContractInfo> {
        DnsData::get().active_contracts.get(&name).cloned()
    }
    pub fn get_all_names(&self) -> Vec<String> {
        DnsData::get().active_contracts.keys().cloned().collect()
    }
    pub fn get_all_addresses(&self) -> Vec<ActorId> {
        DnsData::get()
            .active_contracts
            .values()
            .map(|info| info.program_id.clone())
            .collect()
    }
    pub fn get_name_by_program_id(&self, program_id: ActorId) -> Option<String> {
        let data = DnsData::get();
        data.active_contracts.iter().find_map(|(key, info)| {
            if info.program_id == program_id {
                Some(key.clone())
            } else {
                None
            }
        })
    }
}
